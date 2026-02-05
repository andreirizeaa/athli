import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check } from 'lucide-react-native';
import { PressableOpacity, PressableScale } from 'pressto';
import { FlashList } from '@shopify/flash-list';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { useModalCallbacksStore } from '@/stores/useModalCallbacksStore';
import { IconButton } from '@/components/ui/icon-button';
import { SearchBar } from '@/components/ui/search-bar';
import { Separator } from '@/components/ui/separator';
import { Dialog } from '@/components/ui/dialog';
import { hexToRgba } from '@/utils/colorUtils';
import {
    MUSCLEWIKI_MUSCLE_OPTIONS,
    MUSCLEWIKI_CATEGORY_OPTIONS,
    MUSCLEWIKI_DIFFICULTY_OPTIONS,
} from '@athli/shared-types';

type FilterType = 'muscles' | 'categories' | 'difficulties';

const FILTER_OPTIONS: Record<FilterType, { value: string; label: string }[]> = {
    muscles: [...MUSCLEWIKI_MUSCLE_OPTIONS],
    categories: [...MUSCLEWIKI_CATEGORY_OPTIONS],
    difficulties: [...MUSCLEWIKI_DIFFICULTY_OPTIONS],
};

const FILTER_TITLES: Record<FilterType, string> = {
    muscles: 'exerciseFilter.muscleGroup',
    categories: 'exerciseFilter.equipment',
    difficulties: 'exerciseFilter.difficulty',
};

export default function ExerciseFilterValuesModal() {
    const router = useRouter();
    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();
    const insets = useSafeAreaInsets();
    const listRef = useRef<any>(null);

    const params = useLocalSearchParams<{
        filterType: FilterType;
        initialSelected?: string;
    }>();

    const filterType = params.filterType as FilterType;
    const options = FILTER_OPTIONS[filterType] || [];
    const title = FILTER_TITLES[filterType] ? t(FILTER_TITLES[filterType]) : '';

    // Parse initial values
    const initialSelected = useMemo(() => {
        return params.initialSelected ? params.initialSelected.split(',').filter(Boolean) : [];
    }, [params.initialSelected]);

    // State
    const [selectedValues, setSelectedValues] = useState<string[]>(initialSelected);
    const [searchQuery, setSearchQuery] = useState('');
    const [showDiscardDialog, setShowDiscardDialog] = useState(false);

    const { triggerFilterValuesSelect } = useModalCallbacksStore();

    // Check if there are changes
    const hasChanges = useMemo(() => {
        return JSON.stringify([...selectedValues].sort()) !== JSON.stringify([...initialSelected].sort());
    }, [selectedValues, initialSelected]);

    // Scroll to top when search query changes
    useEffect(() => {
        listRef.current?.scrollToOffset({ offset: 0, animated: false });
    }, [searchQuery]);

    // Filter options based on search
    const filteredOptions = useMemo(() => {
        if (!searchQuery.trim()) return options;
        const query = searchQuery.toLowerCase();
        return options.filter(option => option.label.toLowerCase().includes(query));
    }, [options, searchQuery]);

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
        triggerFilterValuesSelect(filterType, selectedValues);
        if (router.canGoBack()) {
            router.back();
        }
    }, [router, filterType, selectedValues, triggerFilterValuesSelect]);

    const toggleValue = useCallback((value: string) => {
        setSelectedValues(prev => {
            const isSelected = prev.includes(value);
            return isSelected
                ? prev.filter(v => v !== value)
                : [...prev, value];
        });
    }, []);

    const clearAll = useCallback(() => {
        setSelectedValues([]);
    }, []);

    const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
    const gradientHeight = headerHeight + 12;

    const renderItem = useCallback(({ item }: { item: { value: string; label: string } }) => {
        const isSelected = selectedValues.includes(item.value);
        return (
            <PressableOpacity
                style={styles.optionItem}
                onPress={() => toggleValue(item.value)}
            >
                <Text style={[styles.optionLabel, { color: themeColors.text }]} numberOfLines={1}>
                    {item.label}
                </Text>
                <View style={[
                    styles.checkbox,
                    { borderColor: isSelected ? themeColors.primary : themeColors.border },
                    isSelected && { backgroundColor: themeColors.primary },
                ]}>
                    {isSelected && (
                        <Check {...({ size: 12, color: themeColors.primaryForeground, strokeWidth: 3 } as any)} />
                    )}
                </View>
            </PressableOpacity>
        );
    }, [selectedValues, toggleValue, themeColors]);

    const renderSeparator = useCallback(() => (
        <Separator style={styles.separator} />
    ), []);

    return (
        <View style={[styles.container, { backgroundColor: themeColors.backgroundSecondary }]}>
            {/* List */}
            <View style={styles.listContainer}>
                <FlashList
                    ref={listRef}
                    data={filteredOptions}
                    renderItem={renderItem}
                    ItemSeparatorComponent={renderSeparator}
                    ListHeaderComponent={
                        <View style={[styles.listHeader, { paddingTop: headerHeight + 16 }]}>
                            <SearchBar
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                placeholder={t('general.searchPlaceholder')}
                            />
                            {selectedValues.length > 0 && (
                                <PressableScale
                                    onPress={clearAll}
                                    style={[styles.clearButton, { backgroundColor: themeColors.surfaceSecondary }]}
                                >
                                    <Text style={[styles.clearButtonText, { color: themeColors.text }]}>
                                        {t('exerciseFilter.clearAll')}
                                    </Text>
                                </PressableScale>
                            )}
                        </View>
                    }
                    keyExtractor={(item) => item.value}
                    contentContainerStyle={styles.listContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                />
            </View>

            {/* Fixed Header */}
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
                        {title}
                    </Text>
                    <IconButton
                        icon={{ sf: 'checkmark', IconComponent: Check }}
                        onPress={handleApply}
                        size="md"
                        variant="primary"
                    />
                </View>
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
    listContainer: {
        flex: 1,
    },
    listHeader: {
        paddingHorizontal: 16,
        paddingBottom: 12,
        gap: 12,
    },
    listContent: {
        paddingBottom: 40,
    },
    separator: {
        marginHorizontal: 16,
    },
    clearButton: {
        width: '100%',
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    clearButtonText: {
        ...typography.p1,
        fontWeight: '600',
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    optionLabel: {
        ...typography.p2,
        flex: 1,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
