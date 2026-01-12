import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Platform, StyleSheet, Text, View, LayoutChangeEvent, Alert } from 'react-native';
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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { typography } from '@/constants/typography';
import { defaultMetrics, type DefaultMetric } from '@/constants/metrics';
import { useThemePreference, useColorScheme } from '@/stores';
import { useTranslations } from '@/stores';
import { useModalCallbacks, type ScheduleData } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { InputBox, TextAreaInput } from '@/components/ui/form-inputs';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { SearchBar } from '@/components/ui/search-bar';
import { hexToRgba } from '@/utils/colorUtils';
import { createMetric, updateMetric } from '@/services/coach/coach-metric-service';


type TabKey = 'new' | 'templates';

export default function AddMetricModal() {
    const router = useRouter();
    const { primaryColor, colors: themeColors } = useThemePreference();
    const colorScheme = useColorScheme();
    const { t } = useTranslations();
    const insets = useSafeAreaInsets();
    const { scheduleData, setScheduleData, setScheduleCallback } = useModalCallbacks();

    const params = useLocalSearchParams<{
        editingId?: string;
        name?: string;
        unit?: string;
        description?: string;
        schedule_config?: string; // JSON stringified schedule
    }>();
    const isEditing = !!params.editingId;

    const [selectedTab, setSelectedTab] = useState<TabKey>(isEditing ? 'new' : 'templates');
    const underlinePosition = useSharedValue(0);
    const underlineWidth = useSharedValue(0);
    const tabLayoutsRef = useRef<{ [key: string]: { x: number; width: number } }>({});

    // Tab order for swipe navigation
    const tabOrder: TabKey[] = ['templates', 'new'];

    // Store original schedule for change detection
    const originalScheduleRef = useRef<ScheduleData | null>(null);

    // Form state
    const [name, setName] = useState(params.name || '');
    const [unit, setUnit] = useState(params.unit || '');
    const [description, setDescription] = useState(params.description || '');

    // Initialize schedule data when editing
    useEffect(() => {
        if (isEditing && params.schedule_config) {
            try {
                const parsedSchedule = JSON.parse(params.schedule_config);
                originalScheduleRef.current = parsedSchedule;
                setScheduleData(parsedSchedule);
            } catch (e) {
                console.error('Failed to parse schedule_config:', e);
                originalScheduleRef.current = null;
            }
        } else {
            originalScheduleRef.current = null;
            // Clear schedule data when opening for new metric
            if (!isEditing) {
                setScheduleData(null);
            }
        }
    }, [isEditing, params.schedule_config, setScheduleData]);

    // TanStack Query
    const queryClient = useQueryClient();

    const saveMutation = useMutation({
        mutationFn: async (data: any) => {
            if (isEditing && params.editingId) {
                return updateMetric(params.editingId, data);
            }
            return createMetric(data);
        },
        onSuccess: async () => {
            // Refetch to update the cache and trigger Zustand store update
            await queryClient.refetchQueries({ queryKey: ['metrics'] });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            handleClose();
        },
        onError: (error: Error) => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert(
                t('general.error'),
                error.message || t('general.errorSaving'),
                [{ text: t('general.ok') }]
            );
        },
    });

    // Search state for templates
    const [searchQuery, setSearchQuery] = useState('');

    // Check if schedule is configured
    const hasLogFrequency = !!scheduleData;

    // Helper to get day suffix
    const getDaySuffix = (day: number): string => {
        if (day >= 11 && day <= 13) {
            return 'th';
        }
        const lastDigit = day % 10;
        if (lastDigit === 1) return 'st';
        if (lastDigit === 2) return 'nd';
        if (lastDigit === 3) return 'rd';
        return 'th';
    };

    // Format schedule text for display
    const formatScheduleText = useCallback((schedule: ScheduleData | null): string => {
        if (!schedule) {
            return t('library.addMetric.setSchedule');
        }

        if (schedule.frequency === 'daily') {
            if (schedule.selectedDays && schedule.selectedDays.length === 7) {
                return t('shared.defineSchedule.frequency.daily');
            }
            if (schedule.selectedDays && schedule.selectedDays.length > 0) {
                const dayNames = schedule.selectedDays.map(day => t(`calendar.newSession.repeatOptions.weekdays.${day}`)).join(', ');
                return `${t('shared.defineSchedule.frequency.daily')} (${dayNames})`;
            }
            return t('shared.defineSchedule.frequency.daily');
        } else if (schedule.frequency === 'weekly') {
            if (schedule.selectedDays && schedule.selectedDays.length > 0) {
                const dayName = t(`calendar.newSession.repeatOptions.weekdays.${schedule.selectedDays[0]}`);
                return `${t('shared.defineSchedule.frequency.weekly')} (${dayName})`;
            }
            return t('shared.defineSchedule.frequency.weekly');
        } else if (schedule.frequency === 'biweekly') {
            if (schedule.selectedDays && schedule.selectedDays.length > 0) {
                const dayName = t(`calendar.newSession.repeatOptions.weekdays.${schedule.selectedDays[0]}`);
                return `${t('shared.defineSchedule.frequency.biweekly')} (${dayName})`;
            }
            return t('shared.defineSchedule.frequency.biweekly');
        } else if (schedule.frequency === 'monthly') {
            if (schedule.monthlyOption === 'first') {
                return t('shared.defineSchedule.monthly.first');
            } else if (schedule.monthlyOption === 'last') {
                return t('shared.defineSchedule.monthly.last');
            } else if (schedule.monthlyOption === 'specific' && schedule.specificDay !== undefined) {
                const day = schedule.specificDay;
                return `${t('shared.defineSchedule.monthly.specific')} (${day}${getDaySuffix(day)})`;
            }
            return t('shared.defineSchedule.frequency.monthly');
        }
        return t('library.addMetric.setSchedule');
    }, [t]);

    // Tabs - Templates first, New second
    const tabs: { key: TabKey; label: string }[] = [
        { key: 'templates', label: t('library.addMetric.tabs.templates') },
        { key: 'new', label: t('library.addMetric.tabs.new') },
    ];

    // Filter templates based on search query
    const filteredTemplates = useMemo(() => {
        if (!searchQuery.trim()) {
            return defaultMetrics;
        }
        const query = searchQuery.toLowerCase().trim();
        return defaultMetrics
            .map((section) => ({
                ...section,
                metrics: section.metrics.filter(
                    (metric) =>
                        metric.name.toLowerCase().includes(query) ||
                        metric.unit.toLowerCase().includes(query)
                ),
            }))
            .filter((section) => section.metrics.length > 0);
    }, [searchQuery]);

    const UNDERLINE_EXTRA_WIDTH = 8;

    // Form validation and change detection
    const { hasChanges, canComplete } = useMemo(() => {
        const trimmedName = name.trim();

        // Only name is required, log frequency is optional
        const formValid = trimmedName.length > 0;

        // Check if schedule has changed
        const scheduleChanged = JSON.stringify(scheduleData) !== JSON.stringify(originalScheduleRef.current);

        // Check if any field has been modified
        let changes = false;
        if (isEditing) {
            changes = name !== (params.name || '') ||
                unit !== (params.unit || '') ||
                description !== (params.description || '') ||
                scheduleChanged;
        } else {
            changes = trimmedName.length > 0 ||
                unit.trim().length > 0 ||
                description.trim().length > 0 ||
                hasLogFrequency;
        }

        return {
            hasChanges: changes,
            canComplete: formValid && changes && !saveMutation.isPending,
        };
    }, [name, unit, description, scheduleData, hasLogFrequency, saveMutation.isPending, isEditing, params]);

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
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setSelectedTab(tabKey);
        }
    };

    // Animate underline when selectedTab changes
    useEffect(() => {
        if (selectedTab) {
            animateUnderline(selectedTab);
        }
    }, [selectedTab]);

    const handleSelectTemplate = useCallback((metric: DefaultMetric) => {
        // Populate form fields
        setName(metric.name);
        setUnit(metric.unit);
        setDescription('');

        // Set schedule data if template has a schedule
        if (metric.schedule) {
            setScheduleData(metric.schedule);
        } else {
            setScheduleData(null);
        }

        // Switch to the New tab
        setSelectedTab('new');
    }, [setScheduleData]);

    const handleOpenScheduleModal = useCallback(() => {
        // Set callback to receive schedule data
        setScheduleCallback((data: ScheduleData) => {
            setScheduleData(data);
        });
        router.push('/modals/shared/define-schedule-modal');
    }, [router, setScheduleCallback, setScheduleData]);

    const handleClearSchedule = useCallback((e?: any) => {
        if (e && typeof e.stopPropagation === 'function') {
            e.stopPropagation();
        }
        setScheduleData(null);
    }, [setScheduleData]);

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
            Alert.alert(
                t('library.addMetric.discardChangesTitle'),
                t('library.addMetric.discardChangesMessage'),
                [
                    {
                        text: t('general.cancel'),
                        style: 'cancel',
                    },
                    {
                        text: t('library.addMetric.discardChanges'),
                        style: 'destructive',
                        onPress: handleClose,
                    },
                ]
            );
        } else {
            handleClose();
        }
    }, [hasChanges, handleClose, t]);

    const handleSave = useCallback(() => {
        if (!canComplete) return;

        const metricData: any = {
            name: name.trim(),
            unit: unit.trim(),
            description: description.trim(),
        };

        if (scheduleData) {
            metricData.schedule_config = scheduleData;
        }

        saveMutation.mutate(metricData);
    }, [canComplete, name, unit, description, scheduleData, saveMutation]);

    const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
    const gradientHeight = headerHeight + 12;

    return (
        <View style={[styles.container, { backgroundColor: themeColors.background }]}>
            {/* Fixed Header with gradient */}
            <View style={[styles.fixedHeader, { height: headerHeight }]}>
                <LinearGradient
                    colors={[
                        hexToRgba(themeColors.background, 1),
                        hexToRgba(themeColors.background, 0.85),
                        hexToRgba(themeColors.background, 0.5),
                        hexToRgba(themeColors.background, 0),
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
                        {isEditing ? t('library.addMetric.editTitle') : t('library.addMetric.title')}
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
                        selectedTab === 'templates' ? styles.templatesContent : styles.formContent,
                        { paddingTop: headerHeight }
                    ]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    bottomOffset={40}
                >
                    {/* Tab Bar - rendered once */}
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

                    {/* Conditional Content */}
                    {selectedTab === 'templates' ? (
                        <>
                            {/* Search Bar */}
                            <SearchBar
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                placeholder={t('library.addMetric.searchPlaceholder')}
                            />

                            {/* Template Categories */}
                            {filteredTemplates.length === 0 ? (
                                <Text style={[styles.emptyText, { color: themeColors.mutedText }]}>
                                    {t('library.addMetric.noTemplatesFound')}
                                </Text>
                            ) : (
                                filteredTemplates.map((section) => (
                                    <View key={section.label} style={styles.categorySection}>
                                        <Text style={[styles.categoryLabel, { color: themeColors.mutedText }]}>
                                            {section.label}
                                        </Text>
                                        <Card style={{ backgroundColor: themeColors.surfaceSecondary }}>
                                            {section.metrics.map((metric, index) => (
                                                <React.Fragment key={metric.name}>
                                                    {index > 0 && <Separator />}
                                                    <PressableOpacity
                                                        style={styles.templateRow}
                                                        onPress={() => handleSelectTemplate(metric)}
                                                    >
                                                        <View style={styles.templateInfo}>
                                                            <Text style={[styles.templateName, { color: themeColors.text }]}>
                                                                {metric.name}
                                                            </Text>
                                                            <Text
                                                                style={[styles.templateUnit, { color: themeColors.mutedText }]}
                                                            >
                                                                {metric.unit}
                                                            </Text>
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
                                label={t('library.addMetric.name')}
                                value={name}
                                onChangeText={setName}
                                placeholder={t('library.addMetric.namePlaceholder')}
                                required
                            />

                            {/* Log Frequency - Optional */}
                            <PressableOpacity
                                style={[styles.scheduleContainer, { backgroundColor: themeColors.surfaceSecondary }]}
                                onPress={handleOpenScheduleModal}
                            >
                                <View style={styles.scheduleContent}>
                                    <View style={styles.scheduleLabelRow}>
                                        <Text style={[styles.scheduleLabel, { color: themeColors.mutedText }]}>
                                            {t('library.addMetric.logFrequency')}
                                        </Text>
                                        <Text style={[styles.optionalLabel, { color: themeColors.mutedText }]}>
                                            {t('library.addMetric.optional')}
                                        </Text>
                                    </View>
                                    <View style={styles.scheduleValueRow}>
                                        <Text
                                            style={[
                                                styles.scheduleValue,
                                                { color: hasLogFrequency ? themeColors.text : themeColors.mutedText },
                                            ]}
                                            numberOfLines={0}
                                        >
                                            {formatScheduleText(scheduleData)}
                                        </Text>
                                        {hasLogFrequency ? (
                                            <View style={styles.clearButtonContainer}>
                                                <PressableOpacity
                                                    style={styles.clearButton}
                                                    onPress={handleClearSchedule}
                                                    hitSlop={8}
                                                >
                                                    <View style={[styles.clearButtonIcon, { backgroundColor: themeColors.mutedText }]}>
                                                        <X {...({ size: 12, color: themeColors.surfaceSecondary, strokeWidth: 3 } as any)} />
                                                    </View>
                                                </PressableOpacity>
                                            </View>
                                        ) : (
                                            <View style={styles.chevronContainer}>
                                                <ChevronRight {...({ size: 20, color: themeColors.mutedText } as any)} />
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </PressableOpacity>

                            <InputBox
                                label={t('library.addMetric.unit')}
                                value={unit}
                                onChangeText={setUnit}
                                placeholder={t('library.addMetric.unitPlaceholder')}
                            />

                            <TextAreaInput
                                label={t('library.addMetric.description')}
                                value={description}
                                onChangeText={setDescription}
                                placeholder={t('library.addMetric.descriptionPlaceholder')}
                                numberOfLines={3}
                                minHeight={60}
                            />
                        </>
                    )}
                </KeyboardAwareScrollView>
            </View>
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
    templateUnit: {
        ...typography.p3,
        marginTop: 2,
    },
    scheduleContainer: {
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 12,
    },
    scheduleContent: {
        flex: 1,
    },
    scheduleLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 2,
    },
    scheduleLabel: {
        ...typography.p4,
    },
    optionalLabel: {
        ...typography.p4,
    },
    scheduleValueRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    scheduleValue: {
        ...typography.p1,
        flex: 1,
        flexShrink: 1,
    },
    clearButtonContainer: {
        flexShrink: 0,
        paddingTop: 2,
    },
    chevronContainer: {
        flexShrink: 0,
        paddingTop: 2,
    },
    clearButton: {
        // No margin needed, using gap in parent
    },
    clearButtonIcon: {
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
