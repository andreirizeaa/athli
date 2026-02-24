import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Platform, StyleSheet, Text, View, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { PressableOpacity } from 'pressto';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check, ChevronDown } from 'lucide-react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { typography } from '@/constants/typography';
import { useThemePreference, useColorScheme } from '@/stores';
import { useTranslations } from '@/stores';
import { useModalCallbacks, type ScheduleData, type ScheduleFrequency, type MonthlyOption } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { DropdownMenuWrapper, type DropdownMenuOption } from '@/components/ui/dropdown-menu';
import { Card } from '@/components/ui/card';
import { hexToRgba } from '@/utils/colorUtils';
import { Dialog } from '@/components/ui/dialog';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
type Day = typeof DAYS[number];

export default function DefineScheduleModal() {
    const router = useRouter();
    const { primaryColor, colors: themeColors } = useThemePreference();
    const colorScheme = useColorScheme();
    const { t } = useTranslations();
    const insets = useSafeAreaInsets();
    const { triggerScheduleSelect, scheduleData } = useModalCallbacks();
    const isFocused = useIsFocused();
    const hasLoadedData = useRef(false);

    // Track initial state to detect changes
    const initialStateRef = useRef<{
        frequency: ScheduleFrequency;
        selectedDays: string[];
        monthlyOption?: MonthlyOption;
        specificDay?: number;
    } | null>(null);

    // Form state
    const [frequency, setFrequency] = useState<ScheduleFrequency>('daily');
    const [selectedDays, setSelectedDays] = useState<Set<string>>(
        new Set(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
    );
    const [monthlyOption, setMonthlyOption] = useState<MonthlyOption>('last');
    const [specificDay, setSpecificDay] = useState<number>(1);
    const [showDiscardDialog, setShowDiscardDialog] = useState(false);

    // Load existing data when modal gains focus
    useEffect(() => {
        if (isFocused && !hasLoadedData.current) {
            let initFrequency: ScheduleFrequency = 'daily';
            let initSelectedDays: string[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            let initMonthlyOption: MonthlyOption = 'last';
            let initSpecificDay = 1;

            if (scheduleData) {
                if (scheduleData.frequency) {
                    initFrequency = scheduleData.frequency;
                    setFrequency(scheduleData.frequency);
                }

                if (scheduleData.selectedDays) {
                    initSelectedDays = scheduleData.selectedDays;
                    setSelectedDays(new Set(scheduleData.selectedDays));
                } else {
                    setSelectedDays(new Set(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']));
                }

                if (scheduleData.monthlyOption) {
                    initMonthlyOption = scheduleData.monthlyOption;
                    setMonthlyOption(scheduleData.monthlyOption);
                }

                if (scheduleData.specificDay !== undefined) {
                    initSpecificDay = scheduleData.specificDay;
                    setSpecificDay(scheduleData.specificDay);
                }
            } else {
                // Reset to defaults
                setFrequency('daily');
                setSelectedDays(new Set(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']));
                setMonthlyOption('last');
                setSpecificDay(1);
            }

            // Store initial state for change detection
            initialStateRef.current = {
                frequency: initFrequency,
                selectedDays: initSelectedDays,
                monthlyOption: initMonthlyOption,
                specificDay: initSpecificDay,
            };

            hasLoadedData.current = true;
        }

        if (!isFocused) {
            hasLoadedData.current = false;
            initialStateRef.current = null;
        }
    }, [isFocused, scheduleData]);

    const handleDismissKeyboard = () => {
        Keyboard.dismiss();
    };

    // Frequency options
    const frequencyOptions: DropdownMenuOption[] = useMemo(() => [
        {
            label: t('shared.defineSchedule.frequency.daily'),
            onPress: () => {
                setFrequency('daily');
                // Reset to all days for daily
                setSelectedDays(new Set(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']));
            },
        },
        {
            label: t('shared.defineSchedule.frequency.weekly'),
            onPress: () => {
                setFrequency('weekly');
                // Reset to single day for weekly
                if (selectedDays.size === 0) {
                    setSelectedDays(new Set(['sunday']));
                } else {
                    // Keep only first selected day
                    const firstDay = Array.from(selectedDays)[0];
                    setSelectedDays(new Set([firstDay]));
                }
            },
        },
        {
            label: t('shared.defineSchedule.frequency.biweekly'),
            onPress: () => {
                setFrequency('biweekly');
                // Reset to single day for biweekly
                if (selectedDays.size === 0) {
                    setSelectedDays(new Set(['sunday']));
                } else {
                    // Keep only first selected day
                    const firstDay = Array.from(selectedDays)[0];
                    setSelectedDays(new Set([firstDay]));
                }
            },
        },
        {
            label: t('shared.defineSchedule.frequency.monthly'),
            onPress: () => setFrequency('monthly'),
        },
    ], [t, selectedDays]);

    // Monthly option options
    const monthlyOptionOptions: DropdownMenuOption[] = useMemo(() => [
        {
            label: t('shared.defineSchedule.monthly.first'),
            onPress: () => setMonthlyOption('first'),
        },
        {
            label: t('shared.defineSchedule.monthly.last'),
            onPress: () => setMonthlyOption('last'),
        },
        {
            label: t('shared.defineSchedule.monthly.specific'),
            onPress: () => setMonthlyOption('specific'),
        },
    ], [t]);

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

    // Specific day options (1-28)
    const specificDayOptions: DropdownMenuOption[] = useMemo(() =>
        Array.from({ length: 28 }, (_, i) => i + 1).map((day) => ({
            label: `${day}${getDaySuffix(day)}`,
            onPress: () => setSpecificDay(day),
        }))
        , []);

    // Get display label for frequency
    const getFrequencyLabel = (): string => {
        return t(`shared.defineSchedule.frequency.${frequency}`);
    };

    // Get display label for monthly option
    const getMonthlyOptionLabel = (): string => {
        if (monthlyOption === 'first') {
            return t('shared.defineSchedule.monthly.first');
        } else if (monthlyOption === 'last') {
            return t('shared.defineSchedule.monthly.last');
        } else {
            return t('shared.defineSchedule.monthly.specific');
        }
    };

    // Get display label for specific day
    const getSpecificDayLabel = (): string => {
        return `${specificDay}${getDaySuffix(specificDay)}`;
    };

    // Handle day toggle
    const handleDayToggle = (day: string) => {
        if (frequency === 'daily') {
            // Multi-select for daily
            const newSelectedDays = new Set(selectedDays);
            if (newSelectedDays.has(day)) {
                newSelectedDays.delete(day);
            } else {
                newSelectedDays.add(day);
            }
            setSelectedDays(newSelectedDays);
        } else if (frequency === 'weekly' || frequency === 'biweekly') {
            // Single select for weekly/biweekly
            setSelectedDays(new Set([day]));
        }
    };

    // Form validation and change detection
    const { hasChanges, canComplete } = useMemo(() => {
        const initial = initialStateRef.current;
        const currentSelectedDaysArray = Array.from(selectedDays).sort();

        // Check if we had no existing schedule data when modal opened
        const hadNoSchedule = !scheduleData;

        // Compare against initial state to detect changes
        let changes = false;
        if (initial) {
            const initialSelectedDaysArray = initial.selectedDays.sort();
            changes =
                frequency !== initial.frequency ||
                JSON.stringify(currentSelectedDaysArray) !== JSON.stringify(initialSelectedDaysArray) ||
                monthlyOption !== initial.monthlyOption ||
                specificDay !== initial.specificDay;
        } else {
            // No initial state means modal just opened with no saved data
            // Any change from defaults counts as a change
            const defaultDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            changes =
                frequency !== 'daily' ||
                JSON.stringify(currentSelectedDaysArray) !== JSON.stringify(defaultDays.sort()) ||
                monthlyOption !== 'last' ||
                specificDay !== 1;
        }

        // Validation
        let valid = true;
        if (frequency === 'daily' || frequency === 'weekly' || frequency === 'biweekly') {
            valid = selectedDays.size > 0;
        } else if (frequency === 'monthly') {
            if (monthlyOption === 'specific') {
                valid = specificDay >= 1 && specificDay <= 28;
            } else {
                valid = true; // first and last don't need additional validation
            }
        }

        return {
            hasChanges: changes,
            // Allow completing if valid AND (there are changes OR no schedule existed before)
            canComplete: valid && (changes || hadNoSchedule),
        };
    }, [frequency, selectedDays, monthlyOption, specificDay, scheduleData]);

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

        const scheduleDataToSave: ScheduleData = {
            frequency,
        };

        if (frequency === 'daily' || frequency === 'weekly' || frequency === 'biweekly') {
            scheduleDataToSave.selectedDays = Array.from(selectedDays);
        } else if (frequency === 'monthly') {
            scheduleDataToSave.monthlyOption = monthlyOption;
            if (monthlyOption === 'specific') {
                scheduleDataToSave.specificDay = specificDay;
            }
        }

        triggerScheduleSelect(scheduleDataToSave);
        handleClose();
    }, [canComplete, frequency, selectedDays, monthlyOption, specificDay, triggerScheduleSelect, handleClose]);

    const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
    const gradientHeight = headerHeight + 12;

    return (
        <View style={[styles.container, { backgroundColor: themeColors.backgroundSecondary }]}>
            <TouchableWithoutFeedback onPress={handleDismissKeyboard} accessible={false}>
                <View style={styles.container}>
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
                        <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? 12 + insets.top : 12 }]}>
                            <IconButton
                                icon={{ sf: 'xmark', IconComponent: X }}
                                onPress={handleCloseWithConfirmation}
                                size="md"
                                color={themeColors.text}
                            />
                            <Text style={[styles.title, { color: themeColors.text }]}>
                                {t('shared.defineSchedule.setFrequency')}
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

                    {/* Scrollable Content */}
                    <KeyboardAwareScrollView
                        style={styles.scrollView}
                        contentContainerStyle={[styles.scrollContent, { paddingTop: headerHeight + 16 }]}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        bottomOffset={40}
                    >
                        <View style={styles.content}>
                            {/* Frequency Card */}
                            <Card variant="form" style={{ paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 }}>
                                {/* Frequency Row */}
                                <DropdownMenuWrapper options={frequencyOptions}>
                                    <View style={styles.fieldRow}>
                                        <Text style={[styles.cardTitle, { color: themeColors.text }]}>
                                            {t('shared.defineSchedule.frequencyLabel')}
                                        </Text>
                                        <View style={styles.dropdownValueRow}>
                                            <Text style={[styles.dropdownValue, { color: themeColors.text }]}>
                                                {getFrequencyLabel()}
                                            </Text>
                                            <ChevronDown {...({ size: 14, color: themeColors.mutedText } as any)} />
                                        </View>
                                    </View>
                                </DropdownMenuWrapper>

                                {/* Monthly Option Row (only for monthly) */}
                                {frequency === 'monthly' && (
                                    <>
                                        <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
                                        <DropdownMenuWrapper options={monthlyOptionOptions}>
                                            <View style={styles.fieldRow}>
                                                <Text style={[styles.cardTitle, { color: themeColors.text }]}>
                                                    {t('shared.defineSchedule.type')}
                                                </Text>
                                                <View style={styles.dropdownValueRow}>
                                                    <Text style={[styles.dropdownValue, { color: themeColors.text }]}>
                                                        {getMonthlyOptionLabel()}
                                                    </Text>
                                                    <ChevronDown {...({ size: 14, color: themeColors.mutedText } as any)} />
                                                </View>
                                            </View>
                                        </DropdownMenuWrapper>

                                        {/* Specific Day Row (only for monthly with specific) */}
                                        {monthlyOption === 'specific' && (
                                            <>
                                                <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
                                                <DropdownMenuWrapper options={specificDayOptions}>
                                                    <View style={styles.fieldRow}>
                                                        <Text style={[styles.cardTitle, { color: themeColors.text }]}>
                                                            {t('shared.defineSchedule.selectDay')}
                                                        </Text>
                                                        <View style={styles.dropdownValueRow}>
                                                            <Text style={[styles.dropdownValue, { color: themeColors.text }]}>
                                                                {getSpecificDayLabel()}
                                                            </Text>
                                                            <ChevronDown {...({ size: 14, color: themeColors.mutedText } as any)} />
                                                        </View>
                                                    </View>
                                                </DropdownMenuWrapper>
                                            </>
                                        )}
                                    </>
                                )}
                            </Card>

                            {/* Days Selection Card (only for daily/weekly/biweekly) */}
                            {(frequency === 'daily' || frequency === 'weekly' || frequency === 'biweekly') && (
                                <Card variant="form" style={{ paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 }}>
                                    {DAYS.map((day, index) => {
                                        const isSelected = selectedDays.has(day);
                                        return (
                                            <React.Fragment key={day}>
                                                {index > 0 && <View style={[styles.divider, { backgroundColor: themeColors.border }]} />}
                                                <PressableOpacity
                                                    style={styles.dayRow}
                                                    onPress={() => handleDayToggle(day)}
                                                >
                                                    <Text style={[styles.dayLabel, { color: themeColors.text }]}>
                                                        {t(`calendar.newSession.repeatOptions.weekdays.${day}`)}
                                                    </Text>
                                                    <View style={styles.checkContainer}>
                                                        {isSelected && (
                                                            <Check {...({ size: 20, color: primaryColor, strokeWidth: 2.5 } as any)} />
                                                        )}
                                                    </View>
                                                </PressableOpacity>
                                            </React.Fragment>
                                        );
                                    })}
                                </Card>
                            )}
                        </View>
                    </KeyboardAwareScrollView>
                </View>
            </TouchableWithoutFeedback>

            <Dialog
                visible={showDiscardDialog}
                onClose={() => setShowDiscardDialog(false)}
                title={t('shared.defineSchedule.discardTitle')}
                message={t('shared.defineSchedule.discardMessage')}
                buttons={[
                    { label: t('general.cancel'), onPress: () => setShowDiscardDialog(false), variant: 'secondary' },
                    { label: t('shared.defineSchedule.discard'), onPress: handleClose, variant: 'destructive' },
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
        paddingBottom: 16,
    },
    content: {
        gap: 16,
    },
    cardTitle: {
        ...typography.p1,
        fontWeight: '600',
    },
    fieldRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    fieldLabel: {
        ...typography.p2,
    },
    divider: {
        height: 1,
        marginHorizontal: 16,
    },
    dropdownValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    dropdownValue: {
        ...typography.p2,
    },
    dayRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    dayLabel: {
        ...typography.p1,
    },
    checkContainer: {
        width: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
