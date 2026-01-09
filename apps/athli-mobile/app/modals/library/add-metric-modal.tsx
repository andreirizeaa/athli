import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Platform, StyleSheet, Text, View, LayoutChangeEvent, Alert } from 'react-native';
import { PressableOpacity } from 'pressto';
import { useRouter } from 'expo-router';
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
import * as Haptics from 'expo-haptics';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { typography } from '@/constants/typography';
import { defaultMetrics, type DefaultMetric } from '@/constants/metrics';
import { useThemePreference, useColorScheme } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { useModalCallbacks, type ScheduleData } from '@/contexts/modal-callbacks';
import { IconButton } from '@/components/icon-button';
import { InputBox, TextAreaInput } from '@/components/form-inputs';
import { Card } from '@/components/card';
import { Separator } from '@/components/separator';
import { SearchBar } from '@/components/search-bar';


type TabKey = 'new' | 'templates';

export default function AddMetricModal() {
    const router = useRouter();
    const { primaryColor, colors: themeColors } = useThemePreference();
    const colorScheme = useColorScheme();
    const { t } = useTranslations();
    const insets = useSafeAreaInsets();
    const { scheduleData, setScheduleData, setScheduleCallback } = useModalCallbacks();

    const [selectedTab, setSelectedTab] = useState<TabKey>('templates');
    const underlinePosition = useSharedValue(0);
    const underlineWidth = useSharedValue(0);
    const tabLayoutsRef = useRef<{ [key: string]: { x: number; width: number } }>({});

    // Tab order for swipe navigation
    const tabOrder: TabKey[] = ['templates', 'new'];

    // Form state
    const [name, setName] = useState('');
    const [unit, setUnit] = useState('');
    const [description, setDescription] = useState('');

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

        // Check if any field has been modified
        const changes = trimmedName.length > 0 || 
                       unit.trim().length > 0 ||
                       description.trim().length > 0 ||
                       hasLogFrequency;

        return {
            hasChanges: changes,
            canComplete: formValid,
        };
    }, [name, unit, description, hasLogFrequency]);

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
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedTab(tabKey);
        animateUnderline(tabKey);
    };

    const handleSwipe = useCallback((direction: 'left' | 'right') => {
        const currentIndex = tabOrder.indexOf(selectedTab);
        let newIndex: number;
        
        if (direction === 'left') {
            // Swipe left = go to next tab
            newIndex = Math.min(currentIndex + 1, tabOrder.length - 1);
        } else {
            // Swipe right = go to previous tab
            newIndex = Math.max(currentIndex - 1, 0);
        }
        
        if (newIndex !== currentIndex) {
            const newTab = tabOrder[newIndex];
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setSelectedTab(newTab);
            animateUnderline(newTab);
        }
    }, [selectedTab, tabOrder]);

    const swipeGesture = Gesture.Pan()
        .activeOffsetX([-20, 20])
        .failOffsetY([-10, 10])
        .onEnd((event) => {
            if (Math.abs(event.velocityX) > 500 || Math.abs(event.translationX) > 50) {
                if (event.translationX < 0) {
                    runOnJS(handleSwipe)('left');
                } else {
                    runOnJS(handleSwipe)('right');
                }
            }
        });

    // Handle selecting a template
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
        animateUnderline('new');
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

        // TODO: Implement save functionality
        // const metricData = {
        //     name: name.trim(),
        //     unit: unit.trim(),
        //     description: description.trim(),
        // };

        handleClose();
    }, [canComplete, name, unit, description, handleClose]);

    const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
    const gradientHeight = headerHeight + 12;

    return (
        <View style={[styles.container, { backgroundColor: themeColors.background }]}>
            {/* Fixed Header with gradient */}
            <View style={[styles.fixedHeader, { height: headerHeight }]}>
                <LinearGradient
                    colors={
                        colorScheme === 'dark'
                            ? ['rgba(0, 0, 0, 1)', 'rgba(0, 0, 0, 0.85)', 'rgba(0, 0, 0, 0.5)', 'rgba(0, 0, 0, 0)']
                            : ['rgba(255, 255, 255, 1)', 'rgba(255, 255, 255, 0.85)', 'rgba(255, 255, 255, 0.5)', 'rgba(255, 255, 255, 0)']
                    }
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
                        {t('library.addMetric.title')}
                    </Text>
                    <IconButton
                        icon={{ sf: 'checkmark', IconComponent: Check }}
                        onPress={handleSave}
                        size="md"
                        variant={canComplete ? 'primary' : 'default'}
                        disabled={!canComplete}
                    />
                </View>
            </View>

            {/* Scrollable Content with Swipe Gesture */}
            <GestureDetector gesture={swipeGesture}>
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
            </GestureDetector>
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
    tabsWrapper: {
        borderBottomWidth: 1,
        marginHorizontal: -16,
        paddingHorizontal: 16,
        marginBottom: 16,
        paddingTop: 16,
    },
    tabsContainer: {
        flexDirection: 'row',
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
        gap: 12,
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
