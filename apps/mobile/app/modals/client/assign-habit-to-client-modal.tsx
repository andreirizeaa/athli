import React, { useCallback, useState, useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { PressableOpacity } from 'pressto';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check, CheckCircle, Folder } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import SquircleView from 'react-native-fast-squircle';

import { typography } from '@/constants/typography';
import { useThemePreference, useTranslations, useClientDetailStore, useCoachProfileStore } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { SearchBar } from '@/components/ui/search-bar';
import { hexToRgba } from '@/utils/colorUtils';
import { fuzzyMatch } from '@/utils/searchUtils';
import { EmptyState } from '@/components/ui/empty-state';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { getAllHabits, type Habit } from '@/services/coach/coach-habit-service';
import { getAllHabitFolders } from '@/services/coach/coach-habit-folder-service';
import { assignHabit } from '@/services/client/client-habit-service';
import { haptics } from '@/utils/haptics';
import { Dialog } from '@/components/ui/dialog';
import { HABIT_UNIT_OPTIONS, HABIT_PERIOD_OPTIONS } from '@athli/shared-types';
import type { HabitFolder } from '@athli/shared-types';

type ListItem =
    | { type: 'folder'; data: HabitFolder }
    | { type: 'habit'; data: Habit };

export default function AssignHabitToClientModal() {
    const router = useRouter();
    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();
    const insets = useSafeAreaInsets();

    const params = useLocalSearchParams<{ clientId: string }>();
    const clientId = params.clientId;

    const coachProfile = useCoachProfileStore((state) => state.profile);
    const coachId = coachProfile?.id;
    const refreshSection = useClientDetailStore((state) => state.refreshSection);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedHabitIds, setSelectedHabitIds] = useState<Set<string>>(new Set());
    const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());
    const [isSaving, setIsSaving] = useState(false);
    const [showErrorDialog, setShowErrorDialog] = useState(false);

    // Use same queryKey as library tabs - reads from existing cache, no new API call
    const { data: habits = [] } = useQuery({
        queryKey: ['habits'],
        queryFn: getAllHabits,
        staleTime: Infinity, // Never consider data stale - library tab handles refresh
        refetchOnMount: false, // Don't refetch when modal opens
        refetchOnWindowFocus: false,
    });

    const { data: folders = [] } = useQuery({
        queryKey: ['habit-folders'],
        queryFn: getAllHabitFolders,
        staleTime: Infinity,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
    });

    // Get habit IDs that belong to each folder
    const folderHabitIds = useMemo(() => {
        const map: Record<string, string[]> = {};
        folders.forEach(f => {
            map[f.id] = habits.filter(h => h.folderId === f.id).map(h => h.id);
        });
        return map;
    }, [folders, habits]);

    // Build combined list: folders first, then unfiled habits
    const combinedList = useMemo(() => {
        const lowerQuery = searchQuery.trim().toLowerCase();

        const filteredFolders = lowerQuery
            ? folders.filter(f => f.name.toLowerCase().includes(lowerQuery))
            : folders;

        // Only show folders that have items
        const nonEmptyFolders = filteredFolders.filter(f => (folderHabitIds[f.id]?.length ?? 0) > 0);

        const unfiledHabits = habits.filter(h => !h.folderId);
        const filteredHabits = lowerQuery
            ? unfiledHabits.filter(h =>
                fuzzyMatch(h.name.toLowerCase(), lowerQuery) ||
                (h.description && fuzzyMatch(h.description.toLowerCase(), lowerQuery))
            )
            : unfiledHabits;

        const items: ListItem[] = [
            ...nonEmptyFolders.map(f => ({ type: 'folder' as const, data: f })),
            ...filteredHabits.map(h => ({ type: 'habit' as const, data: h })),
        ];
        return items;
    }, [habits, folders, folderHabitIds, searchQuery]);

    const handleClose = useCallback(() => {
        if (router.canGoBack()) {
            router.back();
        }
    }, [router]);

    const handleSave = useCallback(async () => {
        // Collect all individual habit IDs: directly selected + unpacked from folders
        const allHabitIds = new Set(selectedHabitIds);
        selectedFolderIds.forEach(folderId => {
            folderHabitIds[folderId]?.forEach(id => allHabitIds.add(id));
        });

        if (allHabitIds.size === 0 || !clientId || !coachId) return;

        setIsSaving(true);
        try {
            await assignHabit({
                habitIds: Array.from(allHabitIds),
                clientId,
                coachId,
            });

            haptics.success();
            await refreshSection('habits');
            handleClose();
        } catch (error) {
            haptics.error();
            setShowErrorDialog(true);
        } finally {
            setIsSaving(false);
        }
    }, [handleClose, selectedHabitIds, selectedFolderIds, folderHabitIds, clientId, coachId, refreshSection]);

    const canSave = (selectedHabitIds.size > 0 || selectedFolderIds.size > 0) && !isSaving;

    const handleHabitToggle = useCallback((habitId: string) => {
        setSelectedHabitIds((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(habitId)) {
                newSet.delete(habitId);
            } else {
                newSet.add(habitId);
            }
            return newSet;
        });
    }, []);

    const handleFolderToggle = useCallback((folderId: string) => {
        setSelectedFolderIds((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(folderId)) {
                newSet.delete(folderId);
            } else {
                newSet.add(folderId);
            }
            return newSet;
        });
    }, []);

    // Helper to get formatted label for unit (matching HabitsTab)
    const getUnitLabel = (value: string | null | undefined): string => {
        if (!value) return '';
        const option = HABIT_UNIT_OPTIONS.find(opt => opt.value === value);
        return option?.label || value;
    };

    // Helper to get formatted label for period (matching HabitsTab)
    const getPeriodLabel = (value: string | null | undefined): string => {
        if (!value) return '';
        if (value === 'daily') return t('library.addHabit.daily');
        if (value === 'weekly') return t('library.addHabit.weekly');
        const option = HABIT_PERIOD_OPTIONS.find(opt => opt.value === value);
        return option?.label || value;
    };

    const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
    const gradientHeight = headerHeight + 12;

    return (
        <View style={[styles.container, { backgroundColor: themeColors.backgroundSecondary }]}>
            {/* Fixed Header with gradient */}
            <View style={[styles.fixedHeader, { height: headerHeight }]}>
                <LinearGradient
                    colors={[
                        hexToRgba(themeColors.backgroundSecondary, 1),
                        hexToRgba(themeColors.backgroundSecondary, 0.85),
                        hexToRgba(themeColors.backgroundSecondary, 0.5),
                        hexToRgba(themeColors.backgroundSecondary, 0),
                    ]}
                    locations={[0, 0.5, 0.8, 1]}
                    style={[styles.headerGradient, { height: gradientHeight }]}
                    pointerEvents="none"
                />
                <View
                    style={[
                        styles.header,
                        {
                            paddingTop: Platform.OS === 'android' ? 12 + insets.top : 12,
                        },
                    ]}
                >
                    <IconButton
                        icon={{ sf: 'xmark', IconComponent: X }}
                        onPress={handleClose}
                        size="md"
                        color={themeColors.text}
                    />
                    <Text style={[styles.title, { color: themeColors.text }]}>
                        {t('clientDetail.assignModals.assignHabit')}
                    </Text>
                    <IconButton
                        icon={{ sf: 'checkmark', IconComponent: Check }}
                        onPress={handleSave}
                        size="md"
                        variant={canSave ? 'primary' : 'default'}
                        disabled={!canSave}
                        loading={isSaving}
                    />
                </View>
            </View>

            <Dialog
                visible={showErrorDialog}
                onClose={() => setShowErrorDialog(false)}
                title={t('general.error')}
                message={t('general.errorSaving')}
                showCloseIcon={false}
                buttons={[{ label: t('general.ok'), onPress: () => setShowErrorDialog(false), variant: 'primary' }]}
            />

            {/* Content */}
            <View style={styles.content}>
                <FlashList
                    data={combinedList}
                    keyExtractor={(item) => item.type === 'folder' ? `folder-${item.data.id}` : item.data.id}
                    renderItem={({ item, index }) => {
                        const isLastItem = index === combinedList.length - 1;

                        if (item.type === 'folder') {
                            const folder = item.data;
                            const isSelected = selectedFolderIds.has(folder.id);
                            const itemCount = folderHabitIds[folder.id]?.length ?? 0;
                            const countLabel = itemCount === 1 ? '1 habit' : `${itemCount} habits`;

                            return (
                                <View>
                                    <PressableOpacity
                                        onPress={() => handleFolderToggle(folder.id)}
                                        style={styles.rowContent}
                                    >
                                        <SquircleView cornerSmoothing={1} style={[styles.iconContainer, { backgroundColor: themeColors.surfacePrimary }]}>
                                            <Folder {...({ size: 24, color: themeColors.text } as any)} />
                                        </SquircleView>
                                        <View style={styles.textContent}>
                                            <Text
                                                style={[styles.name, { color: themeColors.text }]}
                                                numberOfLines={1}
                                            >
                                                {folder.name}
                                            </Text>
                                            <View style={styles.metaRow}>
                                                <View style={[styles.pill, { borderColor: themeColors.mutedText }]}>
                                                    <Text style={[styles.pillText, { color: themeColors.mutedText }]}>
                                                        Folder
                                                    </Text>
                                                </View>
                                                <View style={[styles.pill, { borderColor: themeColors.mutedText }]}>
                                                    <Text style={[styles.pillText, { color: themeColors.mutedText }]}>
                                                        {countLabel}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                        <View
                                            style={[
                                                styles.checkbox,
                                                {
                                                    backgroundColor: isSelected ? themeColors.primary : 'transparent',
                                                    borderColor: isSelected ? themeColors.primary : themeColors.border,
                                                },
                                            ]}
                                        >
                                            {isSelected && (
                                                <Check {...({ size: 16, color: themeColors.primaryForeground } as any)} />
                                            )}
                                        </View>
                                    </PressableOpacity>

                                    {!isLastItem && (
                                        <View style={styles.separatorContainer}>
                                            <View
                                                style={[
                                                    styles.separator,
                                                    { backgroundColor: themeColors.mutedText, opacity: 0.2 },
                                                ]}
                                            />
                                        </View>
                                    )}
                                </View>
                            );
                        }

                        const habit = item.data;
                        const isSelected = selectedHabitIds.has(habit.id);
                        const unitLabel = getUnitLabel(habit.unit);
                        const periodLabel = getPeriodLabel(habit.period);

                        return (
                            <View>
                                <PressableOpacity
                                    onPress={() => handleHabitToggle(habit.id)}
                                    style={styles.rowContent}
                                >
                                    <View style={[styles.iconContainer, { backgroundColor: themeColors.surfacePrimary }]}>
                                        <PlatformIcon
                                            sf="checkmark.circle.fill"
                                            IconComponent={CheckCircle}
                                            size={24}
                                            color={themeColors.text}
                                        />
                                    </View>
                                    <View style={styles.textContent}>
                                        <Text
                                            style={[styles.name, { color: themeColors.text }]}
                                            numberOfLines={1}
                                        >
                                            {habit.name}
                                        </Text>
                                        <View style={styles.metaRow}>
                                            <View style={[styles.pill, { borderColor: themeColors.mutedText }]}>
                                                <Text style={[styles.pillText, { color: themeColors.mutedText }]}>
                                                    {habit.amount} {unitLabel}
                                                </Text>
                                            </View>
                                            <View style={[styles.pill, { borderColor: themeColors.mutedText }]}>
                                                <Text style={[styles.pillText, { color: themeColors.mutedText }]}>
                                                    {periodLabel}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                    <View
                                        style={[
                                            styles.checkbox,
                                            {
                                                backgroundColor: isSelected ? themeColors.primary : 'transparent',
                                                borderColor: isSelected ? themeColors.primary : themeColors.border,
                                            },
                                        ]}
                                    >
                                        {isSelected && (
                                            <Check {...({ size: 16, color: themeColors.primaryForeground } as any)} />
                                        )}
                                    </View>
                                </PressableOpacity>

                                {!isLastItem && (
                                    <View style={styles.separatorContainer}>
                                        <View
                                            style={[
                                                styles.separator,
                                                { backgroundColor: themeColors.mutedText, opacity: 0.2 },
                                            ]}
                                        />
                                    </View>
                                )}
                            </View>
                        );
                    }}
                    contentContainerStyle={[styles.listContent, { paddingTop: headerHeight + 16 }]}
                    ListHeaderComponent={
                        <View style={styles.searchContainer}>
                            <SearchBar
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                placeholder={t('general.searchPlaceholder')}
                            />
                        </View>
                    }
                    ListEmptyComponent={
                        <EmptyState message={t('library.empty.habits')} />
                    }
                    showsVerticalScrollIndicator={false}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    fixedHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    headerGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    title: {
        ...typography.h6,
        flex: 1,
        textAlign: 'center',
    },
    content: {
        flex: 1,
    },
    searchContainer: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    listContent: {
        paddingBottom: 40,
    },
    rowContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    iconContainer: {
        width: 58,
        height: 58,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    textContent: {
        flex: 1,
        marginRight: 8,
    },
    name: {
        ...typography.p1,
        fontWeight: '600',
        marginBottom: 4,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    pill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
        borderWidth: 1,
    },
    pillText: {
        ...typography.p4,
        fontWeight: '500',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 12,
    },
    separatorContainer: {
        paddingLeft: 86,
        paddingRight: 16,
    },
    separator: {
        height: 1,
    },
});
