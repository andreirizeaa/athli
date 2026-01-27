import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Platform, StyleSheet, Text, View, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check } from 'lucide-react-native';
import { PressableOpacity } from 'pressto';

import { typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { useModalCallbacksStore, type ExerciseFilterData } from '@/stores/useModalCallbacksStore';
import { IconButton } from '@/components/ui/icon-button';
import { Dialog } from '@/components/ui/dialog';
import { hexToRgba } from '@/utils/colorUtils';
import {
    MUSCLEWIKI_MUSCLE_OPTIONS,
    MUSCLEWIKI_CATEGORY_OPTIONS,
    MUSCLEWIKI_DIFFICULTY_OPTIONS,
} from '@athli/shared-types';

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

    const { triggerFilterSelect } = useModalCallbacksStore();

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

    const toggleMuscle = useCallback((muscle: string) => {
        setPendingFilters(prev => {
            const currentMuscles = prev.muscles || [];
            const isSelected = currentMuscles.includes(muscle);
            return {
                ...prev,
                muscles: isSelected
                    ? currentMuscles.filter(m => m !== muscle)
                    : [...currentMuscles, muscle],
            };
        });
    }, []);

    const toggleCategory = useCallback((category: string) => {
        setPendingFilters(prev => {
            const currentCategories = prev.categories || [];
            const isSelected = currentCategories.includes(category);
            return {
                ...prev,
                categories: isSelected
                    ? currentCategories.filter(c => c !== category)
                    : [...currentCategories, category],
            };
        });
    }, []);

    const toggleDifficulty = useCallback((difficulty: string) => {
        setPendingFilters(prev => {
            const currentDifficulties = prev.difficulties || [];
            const isSelected = currentDifficulties.includes(difficulty);
            return {
                ...prev,
                difficulties: isSelected
                    ? currentDifficulties.filter(d => d !== difficulty)
                    : [...currentDifficulties, difficulty],
            };
        });
    }, []);

    const clearMuscles = useCallback(() => {
        setPendingFilters(prev => ({ ...prev, muscles: [] }));
    }, []);

    const clearCategories = useCallback(() => {
        setPendingFilters(prev => ({ ...prev, categories: [] }));
    }, []);

    const clearDifficulties = useCallback(() => {
        setPendingFilters(prev => ({ ...prev, difficulties: [] }));
    }, []);

    const clearAllFilters = useCallback(() => {
        setPendingFilters({ muscles: [], categories: [], difficulties: [] });
    }, []);

    const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
    const gradientHeight = headerHeight + 12;

    const renderFilterChip = (
        label: string,
        isSelected: boolean,
        onPress: () => void
    ) => (
        <PressableOpacity
            key={label}
            onPress={onPress}
            style={[
                styles.filterChip,
                {
                    backgroundColor: isSelected ? themeColors.primary : themeColors.surfacePrimary,
                },
            ]}
        >
            <Text
                style={[
                    styles.filterChipText,
                    { color: isSelected ? themeColors.primaryForeground : themeColors.text },
                ]}
            >
                {label}
            </Text>
        </PressableOpacity>
    );

    const renderSectionHeader = (
        title: string,
        count: number,
        onClear: () => void
    ) => (
        <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
                {title}
            </Text>
            {count > 0 && (
                <PressableOpacity onPress={onClear}>
                    <Text style={[styles.clearButton, { color: themeColors.primary }]}>
                        {t('exerciseFilter.clear')}
                    </Text>
                </PressableOpacity>
            )}
        </View>
    );

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
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { paddingTop: headerHeight + 16 }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Clear All Button - under header */}
                {activeFilterCount > 0 && (
                    <PressableOpacity
                        onPress={clearAllFilters}
                        style={[styles.clearAllButton, { borderColor: themeColors.border }]}
                    >
                        <Text style={[styles.clearAllText, { color: themeColors.mutedText }]}>
                            {t('exerciseFilter.clearAll')}
                        </Text>
                    </PressableOpacity>
                )}

                {/* Muscle Group Section */}
                {renderSectionHeader(
                    t('exerciseFilter.muscleGroup'),
                    pendingFilters.muscles?.length || 0,
                    clearMuscles
                )}
                <View style={styles.filterChipsContainer}>
                    {MUSCLEWIKI_MUSCLE_OPTIONS.map(option =>
                        renderFilterChip(
                            option.label,
                            pendingFilters.muscles?.includes(option.value) || false,
                            () => toggleMuscle(option.value)
                        )
                    )}
                </View>

                {/* Equipment Section */}
                {renderSectionHeader(
                    t('exerciseFilter.equipment'),
                    pendingFilters.categories?.length || 0,
                    clearCategories
                )}
                <View style={styles.filterChipsContainer}>
                    {MUSCLEWIKI_CATEGORY_OPTIONS.map(option =>
                        renderFilterChip(
                            option.label,
                            pendingFilters.categories?.includes(option.value) || false,
                            () => toggleCategory(option.value)
                        )
                    )}
                </View>

                {/* Difficulty Section */}
                {renderSectionHeader(
                    t('exerciseFilter.difficulty'),
                    pendingFilters.difficulties?.length || 0,
                    clearDifficulties
                )}
                <View style={styles.filterChipsContainer}>
                    {MUSCLEWIKI_DIFFICULTY_OPTIONS.map(option =>
                        renderFilterChip(
                            option.label,
                            pendingFilters.difficulties?.includes(option.value) || false,
                            () => toggleDifficulty(option.value)
                        )
                    )}
                </View>
            </ScrollView>

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
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 12,
    },
    sectionTitle: {
        ...typography.p1,
        fontWeight: '600',
    },
    clearButton: {
        ...typography.p2,
        fontWeight: '500',
    },
    filterChipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
    },
    filterChipText: {
        ...typography.p2,
        fontWeight: '500',
    },
    clearAllButton: {
        marginBottom: 8,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
    },
    clearAllText: {
        ...typography.p1,
        fontWeight: '500',
    },
});
