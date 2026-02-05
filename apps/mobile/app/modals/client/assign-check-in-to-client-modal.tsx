import React, { useCallback, useState, useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { PressableOpacity } from 'pressto';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check, Calendar } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';

import { typography } from '@/constants/typography';
import { useThemePreference, useTranslations, useClientDetailStore, useCoachProfileStore } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { SearchBar } from '@/components/ui/search-bar';
import { hexToRgba } from '@/utils/colorUtils';
import { fuzzyMatch } from '@/utils/searchUtils';
import { EmptyState } from '@/components/ui/empty-state';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { getCheckIns, type CheckIn } from '@/services/coach/coach-check-in-service';
import { assignClientCheckIn } from '@/services/client/client-form-service';
import { haptics } from '@/utils/haptics';
import { Dialog } from '@/components/ui/dialog';

// Format schedule text for display
const formatSchedule = (schedule: string | undefined): string => {
    if (!schedule) return '';
    const scheduleMap: Record<string, string> = {
        daily: 'Daily',
        weekly: 'Weekly',
        biweekly: 'Bi-weekly',
        monthly: 'Monthly',
        manual: 'Manual',
    };
    return scheduleMap[schedule.toLowerCase()] || schedule.charAt(0).toUpperCase() + schedule.slice(1);
};

export default function AssignCheckInToClientModal() {
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
    const [selectedCheckInIds, setSelectedCheckInIds] = useState<Set<string>>(new Set());
    const [isSaving, setIsSaving] = useState(false);
    const [showErrorDialog, setShowErrorDialog] = useState(false);

    // Use same queryKey as library tabs - reads from existing cache, no new API call
    const { data: checkIns = [] } = useQuery({
        queryKey: ['checkIns'],
        queryFn: getCheckIns,
        staleTime: Infinity, // Never consider data stale - library tab handles refresh
        refetchOnMount: false, // Don't refetch when modal opens
        refetchOnWindowFocus: false,
    });

    // Filter check-ins based on search query
    const filteredCheckIns = useMemo(() => {
        if (!searchQuery.trim()) {
            return checkIns;
        }

        const query = searchQuery.toLowerCase().trim();
        return checkIns.filter((checkIn) =>
            fuzzyMatch(checkIn.name.toLowerCase(), query) ||
            (checkIn.description && fuzzyMatch(checkIn.description.toLowerCase(), query))
        );
    }, [checkIns, searchQuery]);

    const handleClose = useCallback(() => {
        if (router.canGoBack()) {
            router.back();
        }
    }, [router]);

    const handleSave = useCallback(async () => {
        if (selectedCheckInIds.size === 0 || !clientId || !coachId) return;

        setIsSaving(true);
        try {
            await assignClientCheckIn({
                checkInIds: Array.from(selectedCheckInIds),
                clientId,
                coachId,
            });

            haptics.success();
            await refreshSection('check-ins');
            handleClose();
        } catch (error) {
            haptics.error();
            setShowErrorDialog(true);
        } finally {
            setIsSaving(false);
        }
    }, [handleClose, selectedCheckInIds, clientId, coachId, refreshSection]);

    const canSave = selectedCheckInIds.size > 0 && !isSaving;

    const handleCheckInToggle = useCallback((checkInId: string) => {
        setSelectedCheckInIds((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(checkInId)) {
                newSet.delete(checkInId);
            } else {
                newSet.add(checkInId);
            }
            return newSet;
        });
    }, []);

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
                        {t('clientDetail.assignModals.assignCheckIn')}
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
                    data={filteredCheckIns}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item, index }) => {
                        const isSelected = selectedCheckInIds.has(item.id);
                        const isLastItem = index === filteredCheckIns.length - 1;
                        const scheduleLabel = formatSchedule(item.schedule_config?.frequency);
                        const questionCount = item.questions?.length || 0;

                        return (
                            <View>
                                <PressableOpacity
                                    onPress={() => handleCheckInToggle(item.id)}
                                    style={styles.rowContent}
                                >
                                    <View style={[styles.iconContainer, { backgroundColor: themeColors.surfacePrimary }]}>
                                        <PlatformIcon
                                            sf="calendar.badge.clock"
                                            IconComponent={Calendar}
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
                                            <View style={[styles.pill, { borderColor: themeColors.mutedText }]}>
                                                <Text style={[styles.pillText, { color: themeColors.mutedText }]}>
                                                    {questionCount} {questionCount === 1 ? t('general.question') : t('general.questions')}
                                                </Text>
                                            </View>
                                            {scheduleLabel && (
                                                <View style={[styles.pill, { borderColor: themeColors.mutedText }]}>
                                                    <Text style={[styles.pillText, { color: themeColors.mutedText }]}>
                                                        {scheduleLabel}
                                                    </Text>
                                                </View>
                                            )}
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
                        <EmptyState message={t('library.empty.checkIns')} />
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
