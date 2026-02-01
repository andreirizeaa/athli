import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check, ChevronRight } from 'lucide-react-native';
import { PressableOpacity, PressableScale } from 'pressto';
import SquircleView from 'react-native-fast-squircle';

import { typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { useModalCallbacksStore, type ExerciseFilterData } from '@/stores/useModalCallbacksStore';
import { IconButton } from '@/components/ui/icon-button';
import { Dialog } from '@/components/ui/dialog';
import { hexToRgba } from '@/utils/colorUtils';

export default function ExerciseFilterModal() {
    const router = useRouter();
    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();
    const insets = useSafeAreaInsets();

    const params = useLocalSearchParams<{
        initialMuscles?: string;
        initialCategories?: string;
        initialDifficulties?: string;
    }>();

    // Parse initial values from params
    const initialFilters: ExerciseFilterData = useMemo(() => ({
        muscles: params.initialMuscles ? params.initialMuscles.split(',').filter(Boolean) : [],
        categories: params.initialCategories ? params.initialCategories.split(',').filter(Boolean) : [],
        difficulties: params.initialDifficulties ? params.initialDifficulties.split(',').filter(Boolean) : [],
    }), [params.initialMuscles, params.initialCategories, params.initialDifficulties]);

    // Store original filters for change detection
    const originalFilters = useRef(initialFilters);

    // Pending filters state
    const [pendingFilters, setPendingFilters] = useState<ExerciseFilterData>(initialFilters);

    // Dialog state
    const [showDiscardDialog, setShowDiscardDialog] = useState(false);

    const { triggerFilterSelect, setFilterValuesSelectCallback } = useModalCallbacksStore();

    // Set up callback to receive selections from filter values modal
    useEffect(() => {
        setFilterValuesSelectCallback((filterType: string, values: string[]) => {
            setPendingFilters(prev => ({
                ...prev,
                [filterType]: values,
            }));
        });

        return () => {
            setFilterValuesSelectCallback(() => {});
        };
    }, [setFilterValuesSelectCallback]);

    // Check if there are changes
    const hasChanges = useMemo(() => {
        return JSON.stringify(pendingFilters) !== JSON.stringify(originalFilters.current);
    }, [pendingFilters]);

    // Count active filters
    const activeFilterCount = useMemo(() => {
        return (pendingFilters.muscles?.length || 0) +
            (pendingFilters.categories?.length || 0) +
            (pendingFilters.difficulties?.length || 0);
    }, [pendingFilters]);

    const handleClose = useCallback(() => {
        if (router.canGoBack()) {
            router.back();
        }
    }, [router]);

    const handleCloseWithConfirmation = useCallback(() => {
        if (hasChanges) {
            setShowDiscardDialog(true);
        } else {
            handleClose();
        }
    }, [hasChanges, handleClose]);

    const handleApply = useCallback(() => {
        triggerFilterSelect(pendingFilters);
        haptics.success();
        handleClose();
    }, [pendingFilters, triggerFilterSelect, handleClose]);

    const clearAllFilters = useCallback(() => {
        setPendingFilters({ muscles: [], categories: [], difficulties: [] });
    }, []);

    const handleOpenFilterValues = useCallback((filterType: 'muscles' | 'categories' | 'difficulties') => {
        const currentValues = pendingFilters[filterType] || [];
        router.push({
            pathname: '/modals/workout/exercise-filter-values-modal',
            params: {
                filterType,
                initialSelected: currentValues.join(','),
            },
        });
    }, [router, pendingFilters]);

    const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
    const gradientHeight = headerHeight + 12;

    const filterOptions = [
        {
            key: 'muscles' as const,
            label: t('exerciseFilter.muscleGroup'),
            count: pendingFilters.muscles?.length || 0,
        },
        {
            key: 'categories' as const,
            label: t('exerciseFilter.equipment'),
            count: pendingFilters.categories?.length || 0,
        },
        {
            key: 'difficulties' as const,
            label: t('exerciseFilter.difficulty'),
            count: pendingFilters.difficulties?.length || 0,
        },
    ];

    return (
        <View style={[styles.container, { backgroundColor: themeColors.backgroundSecondary }]}>
            {/* Header with gradient */}
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
                        onPress={handleCloseWithConfirmation}
                        size="md"
                        color={themeColors.text}
                    />
                    <Text style={[styles.title, { color: themeColors.text }]}>
                        {t('exerciseFilter.title')}
                    </Text>
                    <IconButton
                        icon={{ sf: 'checkmark', IconComponent: Check }}
                        onPress={handleApply}
                        size="md"
                        variant="primary"
                    />
                </View>
            </View>

            {/* Content */}
            <View style={[styles.content, { paddingTop: headerHeight + 16 }]}>
                {/* Clear All Button */}
                {activeFilterCount > 0 && (
                    <PressableScale
                        onPress={clearAllFilters}
                        style={[styles.clearButton, { backgroundColor: themeColors.surfaceSecondary }]}
                    >
                        <Text style={[styles.clearButtonText, { color: themeColors.text }]}>
                            {t('exerciseFilter.clearAll')}
                        </Text>
                    </PressableScale>
                )}

                {/* Filter Options Card */}
                <SquircleView
                    cornerSmoothing={1}
                    style={[styles.card, { backgroundColor: themeColors.surfacePrimary }]}
                >
                    {filterOptions.map((option, index) => (
                        <View key={option.key}>
                            <PressableOpacity
                                style={styles.filterRow}
                                onPress={() => handleOpenFilterValues(option.key)}
                            >
                                <Text style={[styles.filterLabel, { color: themeColors.text }]}>
                                    {option.label}
                                </Text>
                                <View style={styles.rowRight}>
                                    {option.count > 0 && (
                                        <View style={[styles.countBadge, { backgroundColor: themeColors.primary }]}>
                                            <Text style={[styles.countBadgeText, { color: themeColors.primaryForeground }]}>
                                                {option.count}
                                            </Text>
                                        </View>
                                    )}
                                    <ChevronRight {...({ size: 18, color: themeColors.mutedText } as any)} />
                                </View>
                            </PressableOpacity>
                            {index < filterOptions.length - 1 && (
                                <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
                            )}
                        </View>
                    ))}
                </SquircleView>
            </View>

            <Dialog
                visible={showDiscardDialog}
                onClose={() => setShowDiscardDialog(false)}
                title={t('exerciseFilter.discardChangesTitle')}
                message={t('exerciseFilter.discardChangesMessage')}
                buttons={[
                    { label: t('exerciseFilter.keepEditing'), onPress: () => setShowDiscardDialog(false), variant: 'secondary' },
                    { label: t('exerciseFilter.discard'), onPress: handleClose, variant: 'destructive' },
                ]}
            />
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
        paddingHorizontal: 16,
    },
    clearButton: {
        width: '100%',
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    clearButtonText: {
        ...typography.p1,
        fontWeight: '600',
    },
    card: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    filterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    filterLabel: {
        ...typography.p1,
        fontWeight: '500',
    },
    rowRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    countBadge: {
        minWidth: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
    },
    countBadgeText: {
        ...typography.p2,
        fontSize: 12,
        fontWeight: '700',
    },
    divider: {
        height: 1,
        marginHorizontal: 16,
    },
});
