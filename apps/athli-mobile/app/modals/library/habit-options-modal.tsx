import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Platform, StyleSheet, Text, View, Alert, Keyboard, TouchableWithoutFeedback, Switch, TextInput } from 'react-native';
import { PressableOpacity } from 'pressto';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check, ChevronDown } from 'lucide-react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { typography } from '@/constants/typography';
import { 
    HABIT_DURATION_PERIOD_OPTIONS,
    type HabitDurationPeriod,
} from '@/constants/training';
import { useThemePreference, useColorScheme } from '@/stores';
import { useTranslations } from '@/stores';
import { useModalCallbacks, type HabitOptionsData } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { DropdownMenuWrapper, type DropdownMenuOption } from '@/components/ui/dropdown-menu';

// Helper to create a date from time string "HH:MM"
const parseTimeString = (timeStr: string): Date => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours || 7, minutes || 0, 0, 0);
    return date;
};

// Helper to format Date to time string "HH:MM"
const formatToTimeString = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
};

// Helper to format time for display (12-hour format)
const formatTimeDisplay = (date: Date): string => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `${displayHours}:${displayMinutes} ${ampm}`;
};

// Convert duration amount and period to days
const convertToDays = (amount: number, period: HabitDurationPeriod): number => {
    switch (period) {
        case 'days': return amount;
        case 'months': return amount * 30;
        case 'years': return amount * 365;
        default: return amount;
    }
};

// Convert days back to amount and period (best fit)
const convertFromDays = (days: number): { amount: string; period: HabitDurationPeriod } => {
    if (days % 365 === 0 && days >= 365) {
        return { amount: String(days / 365), period: 'years' };
    }
    if (days % 30 === 0 && days >= 30) {
        return { amount: String(days / 30), period: 'months' };
    }
    return { amount: String(days), period: 'days' };
};

export default function HabitOptionsModal() {
    const router = useRouter();
    const { primaryColor, colors: themeColors } = useThemePreference();
    const colorScheme = useColorScheme();
    const { t } = useTranslations();
    const insets = useSafeAreaInsets();
    const { triggerHabitOptionsSelect, habitOptionsData } = useModalCallbacks();
    const isFocused = useIsFocused();
    const hasLoadedData = useRef(false);

    // Track initial state to detect changes
    const initialStateRef = useRef<{
        durationEnabled: boolean;
        durationAmount: string;
        durationPeriod: HabitDurationPeriod;
        notificationEnabled: boolean;
        notificationTime: string;
        notificationMessage: string;
    } | null>(null);

    // Switch states
    const [durationEnabled, setDurationEnabled] = useState(false);
    const [notificationEnabled, setNotificationEnabled] = useState(false);

    // Duration fields
    const [durationAmount, setDurationAmount] = useState('');
    const [durationPeriod, setDurationPeriod] = useState<HabitDurationPeriod>('days');

    // Notification fields
    const [notificationTime, setNotificationTime] = useState<Date>(parseTimeString('07:00'));
    const [notificationMessage, setNotificationMessage] = useState('');
    const [showAndroidTimePicker, setShowAndroidTimePicker] = useState(false);

    // Load existing data when modal gains focus
    useEffect(() => {
        if (isFocused && !hasLoadedData.current) {
            let initDurationEnabled = false;
            let initDurationAmount = '';
            let initDurationPeriod: HabitDurationPeriod = 'days';
            let initNotificationEnabled = false;
            let initNotificationTime = '07:00';
            let initNotificationMessage = '';

            if (habitOptionsData) {
                if (habitOptionsData.duration !== undefined) {
                    initDurationEnabled = true;
                    const { amount, period } = convertFromDays(habitOptionsData.duration);
                    initDurationAmount = amount;
                    initDurationPeriod = period;
                    setDurationEnabled(true);
                    setDurationAmount(amount);
                    setDurationPeriod(period);
                } else {
                    setDurationEnabled(false);
                    setDurationAmount('');
                    setDurationPeriod('days');
                }
                if (habitOptionsData.reminderTime) {
                    initNotificationEnabled = true;
                    initNotificationTime = habitOptionsData.reminderTime;
                    initNotificationMessage = habitOptionsData.reminderMessage || '';
                    setNotificationEnabled(true);
                    setNotificationTime(parseTimeString(habitOptionsData.reminderTime));
                    setNotificationMessage(habitOptionsData.reminderMessage || '');
                } else {
                    setNotificationEnabled(false);
                    setNotificationTime(parseTimeString('07:00'));
                    setNotificationMessage('');
                }
            } else {
                // Reset to defaults if no data
                setDurationEnabled(false);
                setDurationAmount('');
                setDurationPeriod('days');
                setNotificationEnabled(false);
                setNotificationTime(parseTimeString('07:00'));
                setNotificationMessage('');
            }

            // Store initial state for change detection
            initialStateRef.current = {
                durationEnabled: initDurationEnabled,
                durationAmount: initDurationAmount,
                durationPeriod: initDurationPeriod,
                notificationEnabled: initNotificationEnabled,
                notificationTime: initNotificationTime,
                notificationMessage: initNotificationMessage,
            };

            hasLoadedData.current = true;
        }
        
        if (!isFocused) {
            hasLoadedData.current = false;
            initialStateRef.current = null;
        }
    }, [isFocused, habitOptionsData]);

    const handleDismissKeyboard = () => {
        Keyboard.dismiss();
    };

    // Duration period options for dropdown
    const durationPeriodOptions: DropdownMenuOption[] = useMemo(() => 
        HABIT_DURATION_PERIOD_OPTIONS.map((opt) => ({
            label: t(`library.habitOptions.durationPeriods.${opt.value}`),
            onPress: () => setDurationPeriod(opt.value),
        }))
    , [t]);

    // Get display label for selected period
    const getPeriodLabel = (): string => {
        return t(`library.habitOptions.durationPeriods.${durationPeriod}`);
    };

    // Form validation and change detection
    const { hasChanges, canComplete } = useMemo(() => {
        const initial = initialStateRef.current;
        const currentTimeStr = formatToTimeString(notificationTime);

        // Compare against initial state to detect changes
        let changes = false;
        if (initial) {
            changes = 
                durationEnabled !== initial.durationEnabled ||
                durationAmount !== initial.durationAmount ||
                durationPeriod !== initial.durationPeriod ||
                notificationEnabled !== initial.notificationEnabled ||
                currentTimeStr !== initial.notificationTime ||
                notificationMessage !== initial.notificationMessage;
        } else {
            // No initial state means modal just opened with no saved data
            // Any input counts as a change
            changes = durationEnabled || 
                      notificationEnabled ||
                      durationAmount.trim().length > 0 ||
                      notificationMessage.trim().length > 0;
        }

        // Validation
        let durationValid = true;
        if (durationEnabled) {
            durationValid = durationAmount.trim().length > 0;
        }

        let notificationValid = true;
        if (notificationEnabled) {
            notificationValid = notificationMessage.trim().length > 0;
        }

        const complete = (durationEnabled || notificationEnabled) && durationValid && notificationValid;

        return {
            hasChanges: changes,
            canComplete: complete,
        };
    }, [durationEnabled, notificationEnabled, durationAmount, durationPeriod, notificationMessage]);

    const handleClose = useCallback(() => {
        if (router.canGoBack()) {
            router.back();
        }
    }, [router]);

    const handleCloseWithConfirmation = useCallback(() => {
        if (hasChanges) {
            Alert.alert(
                t('library.habitOptions.discardTitle'),
                t('library.habitOptions.discardMessage'),
                [
                    {
                        text: t('general.cancel'),
                        style: 'cancel',
                    },
                    {
                        text: t('library.habitOptions.discard'),
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

        const optionsData: HabitOptionsData = {};

        if (durationEnabled && durationAmount.trim().length > 0) {
            const amount = parseInt(durationAmount, 10) || 0;
            optionsData.duration = convertToDays(amount, durationPeriod);
        }

        if (notificationEnabled && notificationMessage.trim().length > 0) {
            optionsData.reminderTime = formatToTimeString(notificationTime);
            optionsData.reminderMessage = notificationMessage.trim();
        }

        triggerHabitOptionsSelect(optionsData);
        handleClose();
    }, [canComplete, durationEnabled, durationAmount, durationPeriod, notificationEnabled, notificationTime, notificationMessage, triggerHabitOptionsSelect, handleClose]);

    const handleDurationAmountChange = (text: string) => {
        const numericText = text.replace(/[^0-9]/g, '');
        setDurationAmount(numericText);
    };

    const handleTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
        if (Platform.OS === 'android') {
            setShowAndroidTimePicker(false);
        }
        if (selectedTime) {
            setNotificationTime(selectedTime);
        }
    };

    const handleAndroidTimePress = () => {
        setShowAndroidTimePicker(true);
    };

    const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
    const gradientHeight = headerHeight + 12;
    const iosPickerTextColor = themeColors.text;
    const iosPickerThemeVariant = colorScheme === 'dark' ? 'dark' : 'light';

    return (
        <View style={[styles.container, { backgroundColor: themeColors.background }]}>
            <TouchableWithoutFeedback onPress={handleDismissKeyboard} accessible={false}>
                <View style={styles.container}>
                    {/* Fixed Header */}
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
                        <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? 12 + insets.top : 12 }]}>
                            <IconButton
                                icon={{ sf: 'xmark', IconComponent: X }}
                                onPress={handleCloseWithConfirmation}
                                size="md"
                                color={themeColors.text}
                            />
                            <Text style={[styles.title, { color: themeColors.text }]}>
                                {t('library.habitOptions.title')}
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
                            {/* Duration Card */}
                            <View style={[styles.card, { backgroundColor: themeColors.surfaceSecondary }]}>
                                {/* Switch Row */}
                                <View style={styles.switchRow}>
                                    <Text style={[styles.cardTitle, { color: themeColors.text }]}>
                                        {t('library.habitOptions.duration')}
                                    </Text>
                                    <Switch
                                        value={durationEnabled}
                                        onValueChange={setDurationEnabled}
                                        trackColor={{ false: themeColors.border, true: primaryColor }}
                                        thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
                                        ios_backgroundColor={themeColors.border}
                                    />
                                </View>

                                {/* Duration Fields */}
                                {durationEnabled && (
                                    <>
                                        <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
                                        <View style={styles.fieldRow}>
                                            <View style={styles.labelRow}>
                                                <Text style={[styles.fieldLabel, { color: themeColors.mutedText }]}>
                                                    {t('library.habitOptions.amount')}
                                                </Text>
                                                <Text style={styles.requiredAsterisk}>*</Text>
                                            </View>
                                            <TextInput
                                                style={[styles.fieldInput, { color: themeColors.text }]}
                                                value={durationAmount}
                                                onChangeText={handleDurationAmountChange}
                                                placeholder={t('library.habitOptions.amountPlaceholder')}
                                                placeholderTextColor={themeColors.mutedText}
                                                keyboardType="number-pad"
                                                textAlign="right"
                                            />
                                        </View>
                                        <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
                                        <DropdownMenuWrapper options={durationPeriodOptions}>
                                            <View style={styles.fieldRow}>
                                                <View style={styles.labelRow}>
                                                    <Text style={[styles.fieldLabel, { color: themeColors.mutedText }]}>
                                                        {t('library.habitOptions.period')}
                                                    </Text>
                                                    <Text style={styles.requiredAsterisk}>*</Text>
                                                </View>
                                                <View style={styles.dropdownValueRow}>
                                                    <Text style={[styles.dropdownValue, { color: themeColors.text }]}>
                                                        {getPeriodLabel()}
                                                    </Text>
                                                    <ChevronDown size={14} color={themeColors.mutedText} />
                                                </View>
                                            </View>
                                        </DropdownMenuWrapper>
                                    </>
                                )}
                            </View>

                            {/* Notification Card */}
                            <View style={[styles.card, { backgroundColor: themeColors.surfaceSecondary }]}>
                                {/* Switch Row */}
                                <View style={styles.switchRow}>
                                    <Text style={[styles.cardTitle, { color: themeColors.text }]}>
                                        {t('library.habitOptions.notification')}
                                    </Text>
                                    <Switch
                                        value={notificationEnabled}
                                        onValueChange={setNotificationEnabled}
                                        trackColor={{ false: themeColors.border, true: primaryColor }}
                                        thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
                                        ios_backgroundColor={themeColors.border}
                                    />
                                </View>

                                {/* Notification Fields */}
                                {notificationEnabled && (
                                    <>
                                        <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
                                        <View style={styles.fieldRow}>
                                            <View style={styles.labelRow}>
                                                <Text style={[styles.fieldLabel, { color: themeColors.mutedText }]}>
                                                    {t('library.habitOptions.time')}
                                                </Text>
                                                <Text style={styles.requiredAsterisk}>*</Text>
                                            </View>
                                            {Platform.OS === 'ios' ? (
                                                <DateTimePicker
                                                    value={notificationTime}
                                                    mode="time"
                                                    display="default"
                                                    onChange={handleTimeChange}
                                                    minuteInterval={5}
                                                    is24Hour={false}
                                                    textColor={iosPickerTextColor}
                                                    themeVariant={iosPickerThemeVariant}
                                                    style={{ backgroundColor: 'transparent' }}
                                                />
                                            ) : (
                                                <>
                                                    <PressableOpacity onPress={handleAndroidTimePress}>
                                                        <Text style={[styles.timeText, { color: themeColors.text }]}>
                                                            {formatTimeDisplay(notificationTime)}
                                                        </Text>
                                                    </PressableOpacity>
                                                    {showAndroidTimePicker && (
                                                        <DateTimePicker
                                                            value={notificationTime}
                                                            mode="time"
                                                            display="default"
                                                            onChange={handleTimeChange}
                                                            minuteInterval={5}
                                                            is24Hour={false}
                                                        />
                                                    )}
                                                </>
                                            )}
                                        </View>
                                        <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
                                        <View style={styles.messageContainer}>
                                            <View style={styles.messageLabelRow}>
                                                <View style={styles.labelRow}>
                                                    <Text style={[styles.fieldLabel, { color: themeColors.mutedText }]}>
                                                        {t('library.habitOptions.message')}
                                                    </Text>
                                                    <Text style={styles.requiredAsterisk}>*</Text>
                                                </View>
                                                <Text style={[styles.charCount, { color: themeColors.mutedText }]}>
                                                    {notificationMessage.length}/60
                                                </Text>
                                            </View>
                                            <TextInput
                                                style={[styles.messageInput, { color: themeColors.text }]}
                                                value={notificationMessage}
                                                onChangeText={setNotificationMessage}
                                                placeholder={t('library.habitOptions.messagePlaceholder')}
                                                placeholderTextColor={themeColors.mutedText}
                                                maxLength={60}
                                                multiline
                                            />
                                        </View>
                                    </>
                                )}
                            </View>
                        </View>
                    </KeyboardAwareScrollView>
                </View>
            </TouchableWithoutFeedback>
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
    card: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    cardTitle: {
        ...typography.p1,
        fontWeight: '600',
    },
    divider: {
        height: 1,
        marginHorizontal: 16,
    },
    fieldRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    fieldLabel: {
        ...typography.p2,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    requiredAsterisk: {
        ...typography.p4,
        color: '#EF4444',
        marginLeft: 2,
    },
    fieldInput: {
        ...typography.p1,
        flex: 1,
        textAlign: 'right',
        padding: 0,
        minWidth: 80,
    },
    dropdownValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    dropdownValue: {
        ...typography.p2,
    },
    timeText: {
        ...typography.p1,
        fontWeight: '500',
    },
    messageContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    messageLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    charCount: {
        ...typography.p4,
    },
    messageInput: {
        ...typography.p1,
        padding: 0,
        minHeight: 40,
    },
});
