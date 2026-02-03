import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Platform, StyleSheet, Text, View, LayoutChangeEvent } from 'react-native';
import { PressableOpacity } from 'pressto';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check, ChevronRight } from 'lucide-react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing,
    runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import {
    HABIT_UNIT_OPTIONS,
    type HabitUnit,
    type HabitPeriod,
} from '@athli/shared-types';
import { defaultHabits, type DefaultHabit } from '@/constants/habits';
import { useThemePreference, useColorScheme } from '@/stores';
import { useTranslations } from '@/stores';
import { useModalCallbacks, type HabitOptionsData } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { InputBox, TextAreaInput, SelectInput } from '@/components/ui/form-inputs';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { SearchBar } from '@/components/ui/search-bar';
import { hexToRgba } from '@/utils/colorUtils';
import { addHabit, editHabit } from '@/services/coach/coach-habit-service';
import { updateHabit as updateClientHabit, addHabit as addClientHabit } from '@/services/client/client-habit-service';
import { useClientDetailStore } from '@/stores';


// Helper to format time string "HH:MM" for display (12-hour format)
const formatTimeDisplay = (timeStr: string): string => {
    const [hoursStr, minutesStr] = timeStr.split(':');
    const hours = parseInt(hoursStr, 10) || 0;
    const minutes = parseInt(minutesStr, 10) || 0;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `${displayHours}:${displayMinutes} ${ampm}`;
};

// Helper to format duration in days to human readable
const formatDuration = (days: number, t: (key: string) => string): string => {
    if (days % 365 === 0 && days >= 365) {
        const years = days / 365;
        return `${years} ${t('library.habitOptions.durationPeriods.years')}`;
    }
    if (days % 30 === 0 && days >= 30) {
        const months = days / 30;
        return `${months} ${t('library.habitOptions.durationPeriods.months')}`;
    }
    return `${days} ${t('library.habitOptions.durationPeriods.days')}`;
};

type TabKey = 'new' | 'templates';

export default function AddHabitModal() {
    const router = useRouter();
    const { primaryColor, colors: themeColors } = useThemePreference();
    const colorScheme = useColorScheme();
    const { t } = useTranslations();
    const insets = useSafeAreaInsets();
    const { habitOptionsData, setHabitOptionsData } = useModalCallbacks();

    const params = useLocalSearchParams<{
        editingId?: string;
        name?: string;
        amount?: string;
        unit?: string;
        period?: HabitPeriod;
        description?: string;
        reminderTime?: string;
        reminderMessage?: string;
        duration?: string;
        // Client assignment context (when editing from client detail)
        isClientAssignment?: string;
        assignmentId?: string;
        clientId?: string;
        coachId?: string;
    }>();
    const isEditing = !!params.editingId;
    const isClientAssignment = params.isClientAssignment === 'true';
    const refreshClientHabits = useClientDetailStore((state) => state.refreshSection);

    const [selectedTab, setSelectedTab] = useState<TabKey>('new');
    const underlinePosition = useSharedValue(0);
    const underlineWidth = useSharedValue(0);
    const tabLayoutsRef = useRef<{ [key: string]: { x: number; width: number } }>({});

    // Tab order for swipe navigation
    const tabOrder: TabKey[] = ['templates', 'new'];

    // Form state
    const [name, setName] = useState(params.name || '');
    const [description, setDescription] = useState(params.description || '');
    const [amount, setAmount] = useState(params.amount || '');
    const [unit, setUnit] = useState<HabitUnit | null>((params.unit as HabitUnit) || null);
    const [period, setPeriod] = useState<HabitPeriod>((params.period as HabitPeriod) || 'daily');

    // Dialog state
    const [showErrorDialog, setShowErrorDialog] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [showDiscardDialog, setShowDiscardDialog] = useState(false);

    // TanStack Query
    const queryClient = useQueryClient();

    // Check if we're creating a private habit directly for a client (not editing)
    const isClientPrivateHabit = !isEditing && params.clientId && params.coachId;

    const saveMutation = useMutation({
        mutationFn: async (data: any) => {
            console.log('[AddHabitModal] 📤 Saving habit data:', JSON.stringify(data, null, 2));
            console.log('[AddHabitModal] 📋 Context:', { isEditing, isClientAssignment, isClientPrivateHabit, params });

            if (isEditing) {
                // Client assignment edit - use client service
                if (isClientAssignment && params.assignmentId && params.clientId && params.coachId) {
                    console.log('[AddHabitModal] ✏️ Updating client assignment');
                    await updateClientHabit({
                        assignmentId: params.assignmentId,
                        name: data.name,
                        description: data.description,
                        period: data.period,
                        clientId: params.clientId,
                        coachId: params.coachId,
                    });
                    return;
                }
                // Library habit edit - use coach service
                console.log('[AddHabitModal] ✏️ Editing library habit');
                return editHabit(data);
            }
            // Creating new habit - check if for client or coach library
            if (isClientPrivateHabit) {
                // Create private habit directly on client
                console.log('[AddHabitModal] ➕ Creating private habit for client');
                const result = await addClientHabit({
                    name: data.name,
                    description: data.description,
                    amount: data.amount,
                    unit: data.unit,
                    period: data.period,
                    clientId: params.clientId!,
                    coachId: params.coachId!,
                });
                console.log('[AddHabitModal] ✅ Client habit created:', result);
                return result;
            }
            // Add to coach library
            console.log('[AddHabitModal] ➕ Adding to coach library');
            const result = await addHabit(data);
            console.log('[AddHabitModal] ✅ Library habit created:', result);
            return result;
        },
        onSuccess: async (result) => {
            console.log('[AddHabitModal] 🎉 Save successful, result:', result);
            // Refetch to update the cache and trigger Zustand store update
            if (isClientAssignment || isClientPrivateHabit) {
                console.log('[AddHabitModal] 🔄 Refreshing client habits');
                await refreshClientHabits('habits');
            } else {
                console.log('[AddHabitModal] 🔄 Refetching library habits query');
                await queryClient.refetchQueries({ queryKey: ['habits'] });
            }
            haptics.success();
            handleClose();
        },
        onError: (error: Error) => {
            haptics.error();
            setErrorMessage(error.message || t('general.errorSaving'));
            setShowErrorDialog(true);
        },
    });

    // Search state for templates
    const [searchQuery, setSearchQuery] = useState('');

    // Cleanup options data on unmount
    useEffect(() => {
        return () => {
            setHabitOptionsData(null);
        };
    }, [setHabitOptionsData]);

    // Initialize habitOptionsData from params when editing
    useEffect(() => {
        if (isEditing) {
            const optionsData: HabitOptionsData = {};
            if (params.duration) {
                optionsData.duration = parseInt(params.duration, 10);
            }
            if (params.reminderTime) {
                optionsData.reminderTime = params.reminderTime;
                optionsData.reminderMessage = params.reminderMessage || '';
            }
            if (Object.keys(optionsData).length > 0) {
                setHabitOptionsData(optionsData);
            }
        }
    }, [isEditing, params.duration, params.reminderTime, params.reminderMessage, setHabitOptionsData]);

    // Tabs - Templates first, New second
    const tabs: { key: TabKey; label: string }[] = [
        { key: 'templates', label: t('library.addHabit.tabs.templates') },
        { key: 'new', label: t('library.addHabit.tabs.new') },
    ];

    // Filter templates based on search query
    const filteredTemplates = useMemo(() => {
        if (!searchQuery.trim()) {
            return defaultHabits;
        }
        const query = searchQuery.toLowerCase().trim();
        return defaultHabits
            .map((section) => ({
                ...section,
                habits: section.habits.filter(
                    (habit) =>
                        habit.name.toLowerCase().includes(query) ||
                        (habit.description && habit.description.toLowerCase().includes(query))
                ),
            }))
            .filter((section) => section.habits.length > 0);
    }, [searchQuery]);

    const UNDERLINE_EXTRA_WIDTH = 8;

    // Unit options from constants
    const unitOptions = useMemo(() =>
        HABIT_UNIT_OPTIONS.map((opt) => ({
            value: opt.value,
            label: opt.label,
        }))
        , []);

    // Period options for SelectInput
    const periodOptions = useMemo(() => [
        { value: 'daily' as const, label: t('library.addHabit.daily') },
        { value: 'weekly' as const, label: t('library.addHabit.weekly') },
    ], [t]);

    // Form validation and change detection
    const { hasChanges, canComplete } = useMemo(() => {
        const trimmedName = name.trim();

        // Validate required fields
        const formValid = trimmedName.length > 0;

        // Check if any field has been modified
        let changes = false;
        if (isEditing) {
            // Compare against original params values
            const originalDuration = params.duration ? parseInt(params.duration, 10) : undefined;
            const originalReminderTime = params.reminderTime || undefined;
            const originalReminderMessage = params.reminderMessage || undefined;

            const optionsChanged =
                habitOptionsData?.duration !== originalDuration ||
                habitOptionsData?.reminderTime !== originalReminderTime ||
                habitOptionsData?.reminderMessage !== originalReminderMessage;

            changes = name !== (params.name || '') ||
                amount !== (params.amount || '') ||
                unit !== ((params.unit as HabitUnit) || null) ||
                period !== ((params.period as HabitPeriod) || 'daily') ||
                description !== (params.description || '') ||
                optionsChanged;
        } else {
            changes = trimmedName.length > 0 ||
                amount.trim().length > 0 ||
                unit !== null ||
                period !== 'daily' ||
                description.trim().length > 0 ||
                !!habitOptionsData;
        }

        return {
            hasChanges: changes,
            canComplete: formValid && changes && !saveMutation.isPending,
        };
    }, [name, description, amount, unit, period, habitOptionsData, saveMutation.isPending, isEditing, params]);

    const animateUnderline = (tabKey: TabKey) => {
        const layout = tabLayoutsRef.current[tabKey];
        if (layout) {
            underlinePosition.value = withTiming(layout.x - UNDERLINE_EXTRA_WIDTH / 2, {
                duration: 300,
                easing: Easing.bezier(0.4, 0.0, 0.2, 1),
            });
            underlineWidth.value = withTiming(layout.width + UNDERLINE_EXTRA_WIDTH, {
                duration: 300,
                easing: Easing.bezier(0.4, 0.0, 0.2, 1),
            });
        }
    };

    const handleTabPress = (tabKey: TabKey) => {
        if (selectedTab !== tabKey) {
            haptics.medium();
            setSelectedTab(tabKey);
        }
    };

    // Animate underline when selectedTab changes
    useEffect(() => {
        if (selectedTab) {
            animateUnderline(selectedTab);
        }
    }, [selectedTab]);

    // Handle selecting a template
    const handleSelectTemplate = useCallback((habit: DefaultHabit) => {
        // Populate form fields
        setName(habit.name);
        setDescription(habit.description || '');
        setAmount(String(habit.amount));
        setUnit(habit.unit as HabitUnit);
        setPeriod(habit.period);

        // Populate options data if present
        const optionsData: HabitOptionsData = {};
        if (habit.duration !== undefined) {
            optionsData.duration = habit.duration;
        }
        if (habit.reminderTime) {
            optionsData.reminderTime = habit.reminderTime;
            optionsData.reminderMessage = habit.reminderMessage || '';
        }
        if (Object.keys(optionsData).length > 0) {
            setHabitOptionsData(optionsData);
        } else {
            setHabitOptionsData(null);
        }

        // Switch to the New tab
        setSelectedTab('new');
    }, [setHabitOptionsData]);

    const handleTabLayout = (tabKey: TabKey, event: LayoutChangeEvent) => {
        const { width, x } = event.nativeEvent.layout;
        tabLayoutsRef.current[tabKey] = { x, width };

        // Initialize underline position on first layout
        if (tabKey === selectedTab && underlineWidth.value === 0) {
            underlinePosition.value = x - UNDERLINE_EXTRA_WIDTH / 2;
            underlineWidth.value = width + UNDERLINE_EXTRA_WIDTH;
        }
    };

    const animatedUnderlineStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: underlinePosition.value }],
            width: underlineWidth.value,
        };
    });

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

    const handleSave = useCallback(() => {
        if (!canComplete) return;

        const habitData: any = {
            name: name.trim(),
            description: description.trim(),
            amount: parseInt(amount, 10) || 0,
            unit: unit || '',
            period,
        };

        if (habitOptionsData?.duration !== undefined) {
            habitData.duration = habitOptionsData.duration;
        }
        if (habitOptionsData?.reminderTime) {
            habitData.reminderTime = habitOptionsData.reminderTime;
            habitData.reminderMessage = habitOptionsData.reminderMessage || '';
        }

        if (isEditing && params.editingId) {
            habitData.id = params.editingId;
        }

        saveMutation.mutate(habitData);
    }, [canComplete, name, description, amount, unit, period, habitOptionsData, isEditing, params.editingId, saveMutation]);

    const handleAmountChange = (text: string) => {
        // Only allow numbers
        const numericText = text.replace(/[^0-9]/g, '');
        setAmount(numericText);
    };

    const handleOpenOptionsModal = useCallback(() => {
        router.push('/modals/library/habit-options-modal');
    }, [router]);

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
                        onPress={handleCloseWithConfirmation}
                        size="md"
                        color={themeColors.text}
                    />
                    <Text style={[styles.title, { color: themeColors.text }]}>
                        {isEditing ? t('library.addHabit.editTitle') : t('library.addHabit.title')}
                    </Text>
                    <IconButton
                        icon={{ sf: 'checkmark', IconComponent: Check }}
                        onPress={handleSave}
                        size="md"
                        variant={canComplete ? 'primary' : 'default'}
                        disabled={!canComplete}
                        loading={saveMutation.isPending}
                    />
                </View>
            </View>

            {/* Scrollable Content */}
            <View style={styles.gestureContainer}>
                <KeyboardAwareScrollView
                    style={styles.scrollView}
                    contentContainerStyle={[
                        isEditing || selectedTab === 'new' ? styles.formContent : styles.templatesContent,
                        { paddingTop: isEditing ? headerHeight + 16 : headerHeight }
                    ]}
                    showsVerticalScrollIndicator={false}
                    scrollEnabled={!isEditing}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    bottomOffset={40}
                >
                    {/* Tab Bar - only show when not editing */}
                    {!isEditing && (
                        <View style={[styles.tabsWrapper, { borderBottomColor: themeColors.border }]}>
                            <View style={styles.tabsContainer}>
                                {tabs.map((tab) => {
                                    const isSelected = selectedTab === tab.key;
                                    return (
                                        <View
                                            key={tab.key}
                                            style={styles.tabContainer}
                                            onLayout={(event) => handleTabLayout(tab.key, event)}
                                        >
                                            <PressableOpacity
                                                style={styles.tab}
                                                onPress={() => handleTabPress(tab.key)}
                                            >
                                                <Text
                                                    style={[
                                                        styles.tabText,
                                                        {
                                                            color: isSelected ? themeColors.text : themeColors.mutedText,
                                                            fontWeight: isSelected ? '700' : '600',
                                                        },
                                                    ]}
                                                >
                                                    {tab.label}
                                                </Text>
                                            </PressableOpacity>
                                        </View>
                                    );
                                })}

                                {/* Animated underline */}
                                <Animated.View
                                    style={[
                                        styles.animatedUnderline,
                                        { backgroundColor: primaryColor },
                                        animatedUnderlineStyle,
                                    ]}
                                />
                            </View>
                        </View>
                    )}

                    {/* Conditional Content */}
                    {!isEditing && selectedTab === 'templates' ? (
                        <>
                            {/* Search Bar */}
                            <SearchBar
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                placeholder={t('library.addHabit.searchPlaceholder')}
                            />

                            {/* Template Categories */}
                            {filteredTemplates.length === 0 ? (
                                <Text style={[styles.emptyText, { color: themeColors.mutedText }]}>
                                    {t('library.addHabit.noTemplatesFound')}
                                </Text>
                            ) : (
                                filteredTemplates.map((section) => (
                                    <View key={section.label} style={styles.categorySection}>
                                        <Text style={[styles.categoryLabel, { color: themeColors.mutedText }]}>
                                            {section.label}
                                        </Text>
                                        <Card variant="form">
                                            {section.habits.map((habit, index) => (
                                                <React.Fragment key={habit.name}>
                                                    {index > 0 && <Separator />}
                                                    <PressableOpacity
                                                        style={styles.templateRow}
                                                        onPress={() => handleSelectTemplate(habit)}
                                                    >
                                                        <View style={styles.templateInfo}>
                                                            <Text style={[styles.templateName, { color: themeColors.text }]}>
                                                                {habit.name}
                                                            </Text>
                                                            {habit.description && (
                                                                <Text
                                                                    style={[styles.templateDescription, { color: themeColors.mutedText }]}
                                                                    numberOfLines={1}
                                                                >
                                                                    {habit.description}
                                                                </Text>
                                                            )}
                                                        </View>
                                                        <ChevronRight {...({ size: 20, color: themeColors.mutedText } as any)} />
                                                    </PressableOpacity>
                                                </React.Fragment>
                                            ))}
                                        </Card>
                                    </View>
                                ))
                            )}
                        </>
                    ) : (
                        <>
                            <InputBox
                                label={t('library.addHabit.name')}
                                value={name}
                                onChangeText={setName}
                                placeholder={t('library.addHabit.namePlaceholder')}
                                required
                                autoFocus
                            />

                            <TextAreaInput
                                label={t('library.addHabit.description')}
                                value={description}
                                onChangeText={setDescription}
                                placeholder={t('library.addHabit.descriptionPlaceholder')}
                                numberOfLines={3}
                                minHeight={60}
                            />

                            <View style={styles.amountUnitRow}>
                                <View style={styles.halfWidth}>
                                    <InputBox
                                        label={t('library.addHabit.amount')}
                                        value={amount}
                                        onChangeText={handleAmountChange}
                                        placeholder={t('library.addHabit.amountPlaceholder')}
                                        keyboardType="number-pad"
                                        required
                                    />
                                </View>
                                <View style={styles.halfWidth}>
                                    <SelectInput
                                        label={t('library.addHabit.unit')}
                                        value={unit}
                                        onChange={setUnit}
                                        options={unitOptions}
                                        placeholder={t('library.addHabit.unitPlaceholder')}
                                        required
                                        clearable={false}
                                    />
                                </View>
                            </View>

                            <SelectInput
                                label={t('library.addHabit.period')}
                                options={periodOptions}
                                value={period}
                                onChange={setPeriod}
                                required
                                clearable={false}
                            />

                            {/* Duration and Notification - Optional */}
                            <PressableOpacity onPress={handleOpenOptionsModal}>
                                <Card variant="form">
                                    <View style={styles.optionsLabelRow}>
                                        <Text style={[styles.optionsLabel, { color: themeColors.mutedText }]}>
                                            {t('library.addHabit.durationAndNotification')}
                                        </Text>
                                        <Text style={[styles.optionalLabel, { color: themeColors.mutedText }]}>
                                            {t('library.addHabit.optional')}
                                        </Text>
                                    </View>
                                    {(habitOptionsData?.duration !== undefined || habitOptionsData?.reminderTime) ? (
                                        <View style={styles.optionsValuesContainer}>
                                            {habitOptionsData?.duration !== undefined && (
                                                <View style={styles.optionValueRow}>
                                                    <Text style={[styles.optionDisplayText, { color: themeColors.text }]}>
                                                        {t('library.habitOptions.duration')}: {formatDuration(habitOptionsData.duration, t)}
                                                    </Text>
                                                    <PressableOpacity
                                                        style={styles.clearButton}
                                                        onPress={(e: any) => {
                                                            if (e && typeof e.stopPropagation === 'function') {
                                                                e.stopPropagation();
                                                            }
                                                            const newOptions = { ...habitOptionsData };
                                                            delete newOptions.duration;
                                                            setHabitOptionsData(Object.keys(newOptions).length > 0 ? newOptions : null);
                                                        }}
                                                        hitSlop={8}
                                                    >
                                                        <View style={[styles.clearButtonIcon, { backgroundColor: themeColors.mutedText }]}>
                                                            <X {...({ size: 12, color: themeColors.surfacePrimary, strokeWidth: 3 } as any)} />
                                                        </View>
                                                    </PressableOpacity>
                                                </View>
                                            )}
                                            {habitOptionsData?.reminderTime && (
                                                <View style={styles.optionValueRow}>
                                                    <Text style={[styles.optionDisplayText, { color: themeColors.text }]}>
                                                        {t('library.habitOptions.notification')}: {formatTimeDisplay(habitOptionsData.reminderTime)}
                                                    </Text>
                                                    <PressableOpacity
                                                        style={styles.clearButton}
                                                        onPress={(e: any) => {
                                                            if (e && typeof e.stopPropagation === 'function') {
                                                                e.stopPropagation();
                                                            }
                                                            const newOptions = { ...habitOptionsData };
                                                            delete newOptions.reminderTime;
                                                            delete newOptions.reminderMessage;
                                                            setHabitOptionsData(Object.keys(newOptions).length > 0 ? newOptions : null);
                                                        }}
                                                        hitSlop={8}
                                                    >
                                                        <View style={[styles.clearButtonIcon, { backgroundColor: themeColors.mutedText }]}>
                                                            <X {...({ size: 12, color: themeColors.surfacePrimary, strokeWidth: 3 } as any)} />
                                                        </View>
                                                    </PressableOpacity>
                                                </View>
                                            )}
                                        </View>
                                    ) : (
                                        <View style={styles.optionsPlaceholderRow}>
                                            <Text style={[styles.optionsPlaceholder, { color: themeColors.mutedText }]}>
                                                {t('library.addHabit.setOptions')}
                                            </Text>
                                            <ChevronRight {...({ size: 20, color: themeColors.mutedText } as any)} />
                                        </View>
                                    )}
                                </Card>
                            </PressableOpacity>
                        </>
                    )}
                </KeyboardAwareScrollView>
            </View>

            <Dialog
                visible={showErrorDialog}
                onClose={() => setShowErrorDialog(false)}
                title={t('general.error')}
                message={errorMessage}
                showCloseIcon={false}
                buttons={[{ label: t('general.ok'), onPress: () => setShowErrorDialog(false), variant: 'primary' }]}
            />

            <Dialog
                visible={showDiscardDialog}
                onClose={() => setShowDiscardDialog(false)}
                title={t('library.addHabit.discardChangesTitle')}
                message={t('library.addHabit.discardChangesMessage')}
                buttons={[
                    { label: t('general.cancel'), onPress: () => setShowDiscardDialog(false), variant: 'secondary' },
                    { label: t('library.addHabit.discardChanges'), onPress: handleClose, variant: 'destructive' },
                ]}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    gestureContainer: {
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
    tabsWrapper: {
        borderBottomWidth: 1,
        marginHorizontal: -16,
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    tabsContainer: {
        flexDirection: 'row',
        flex: 1,
    },
    tabContainer: {
        flex: 1,
    },
    tab: {
        paddingBottom: 12,
        alignItems: 'center',
    },
    tabText: {
        ...typography.p1,
    },
    animatedUnderline: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        height: 3,
        borderRadius: 1.5,
        zIndex: 10,
    },
    scrollView: {
        flex: 1,
    },
    formContent: {
        flexGrow: 1,
        paddingHorizontal: 16,
        paddingBottom: 32,
        gap: 16,
    },
    templatesContent: {
        flexGrow: 1,
        paddingHorizontal: 16,
        paddingBottom: 32,
        gap: 16,
    },
    emptyText: {
        ...typography.p2,
        textAlign: 'center',
        marginTop: 32,
    },
    categorySection: {
        gap: 8,
    },
    categoryLabel: {
        ...typography.p1,
        fontWeight: '600',
    },
    templateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    templateInfo: {
        flex: 1,
        marginRight: 12,
    },
    templateName: {
        ...typography.p1,
        fontWeight: '500',
    },
    templateDescription: {
        ...typography.p3,
        marginTop: 2,
    },
    amountUnitRow: {
        flexDirection: 'row',
        gap: 12,
    },
    halfWidth: {
        flex: 1,
    },
    optionsLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 2,
    },
    optionsLabel: {
        ...typography.p4,
    },
    optionalLabel: {
        ...typography.p4,
    },
    optionsPlaceholderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 28,
    },
    optionsPlaceholder: {
        ...typography.p1,
        flex: 1,
    },
    optionsValuesContainer: {
        gap: 4,
        marginTop: 2,
    },
    optionValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 28,
    },
    optionDisplayText: {
        ...typography.p1,
        flex: 1,
    },
    clearButton: {
        marginLeft: 12,
    },
    clearButtonIcon: {
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
