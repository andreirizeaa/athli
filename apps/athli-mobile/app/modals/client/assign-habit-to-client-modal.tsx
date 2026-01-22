import React, { useCallback, useState, useMemo } from 'react';
import { Platform, StyleSheet, Text, View, Alert } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { PressableOpacity } from 'pressto';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check, CheckCircle } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';

import { typography } from '@/constants/typography';
import { useThemePreference, useTranslations, useClientDetailStore, useCoachProfileStore } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { SearchBar } from '@/components/ui/search-bar';
import { hexToRgba } from '@/utils/colorUtils';
import { fuzzyMatch } from '@/utils/searchUtils';
import { EmptyState } from '@/components/ui/empty-state';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { getAllHabits, type Habit } from '@/services/coach/coach-habit-service';
import { assignHabit } from '@/services/client/client-habit-service';
import { haptics } from '@/utils/haptics';
import { HABIT_UNIT_OPTIONS, HABIT_PERIOD_OPTIONS } from '@athli/shared-types';

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
    const [isSaving, setIsSaving] = useState(false);

    // Use same queryKey as library tabs - reads from existing cache, no new API call
    const { data: habits = [] } = useQuery({
        queryKey: ['habits'],
        queryFn: getAllHabits,
        staleTime: Infinity, // Never consider data stale - library tab handles refresh
        refetchOnMount: false, // Don't refetch when modal opens
        refetchOnWindowFocus: false,
    });

    // Filter habits based on search query
    const filteredHabits = useMemo(() => {
        if (!searchQuery.trim()) {
            return habits;
        }

        const query = searchQuery.toLowerCase().trim();
        return habits.filter((habit) =>
            fuzzyMatch(habit.name.toLowerCase(), query) ||
            (habit.description && fuzzyMatch(habit.description.toLowerCase(), query))
        );
    }, [habits, searchQuery]);

    const handleClose = useCallback(() => {
        if (router.canGoBack()) {
            router.back();
        }
    }, [router]);

    const handleSave = useCallback(async () => {
        if (selectedHabitIds.size === 0 || !clientId || !coachId) return;

        setIsSaving(true);
        try {
            await assignHabit({
                habitIds: Array.from(selectedHabitIds),
                clientId,
                coachId,
            });

            haptics.success();
            await refreshSection('habits');
            handleClose();
        } catch (error) {
            haptics.error();
            Alert.alert(
                t('general.error'),
                t('general.errorSaving')
            );
        } finally {
            setIsSaving(false);
        }
    }, [handleClose, selectedHabitIds, clientId, coachId, refreshSection, t]);

    const canSave = selectedHabitIds.size > 0 && !isSaving;

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

            {/* Content */}
            <View style={styles.content}>
                <FlashList
                    data={filteredHabits}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item, index }) => {
                        const isSelected = selectedHabitIds.has(item.id);
                        const isLastItem = index === filteredHabits.length - 1;
                        const unitLabel = getUnitLabel(item.unit);
                        const periodLabel = getPeriodLabel(item.period);

                        return (
                            <View>
                                <PressableOpacity
                                    onPress={() => handleHabitToggle(item.id)}
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
                                            {item.name}
                                        </Text>
                                        <View style={styles.metaRow}>
                                            <Text style={[styles.metaText, { color: themeColors.mutedText }]}>
                                                {item.amount} {unitLabel}
                                            </Text>
                                            <Text style={[styles.metaDot, { color: themeColors.mutedText }]}>•</Text>
                                            <Text style={[styles.metaText, { color: themeColors.mutedText }]} numberOfLines={1}>
                                                {periodLabel}
                                            </Text>
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
    },
    metaText: {
        ...typography.p3,
    },
    metaDot: {
        marginHorizontal: 6,
        ...typography.p3,
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
