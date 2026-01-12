import React, { useState, useMemo, useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PressableOpacity } from 'pressto';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Storage } from '@/lib/storage';
import { ChevronDown, ChevronLeft, Plus, Dumbbell, ClipboardList } from 'lucide-react-native';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { SwipeableCalendar } from '@/components/features/calendar/swipeable-calendar';
import { formatDateDDMMYYYY } from '@/lib/utils/date-formatters';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { DropdownMenuWrapper } from '@/components/ui/dropdown-menu';

const SELECTED_DATE_KEY = '@select_date_modal_selected_date_client';

export default function ClientTrainingScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { primaryColor, colors: themeColors } = useThemePreference();
    const { t } = useTranslations();
    const iconColor = themeColors.text;

    const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return today;
    });
    const [hasSelectedDate, setHasSelectedDate] = useState(false);
    const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth());
    const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
    const [calendarKey, setCalendarKey] = useState(0); // Key to force calendar reset

    const [displayedDate, setDisplayedDate] = useState<Date | null>(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return today;
    });
    const [incomingDate, setIncomingDate] = useState<Date | null>(null);

    const animateCalendarForDateChange = useCallback(
        (nextDate: Date) => {
            const prevDate = displayedDate;
            if (!prevDate) {
                setDisplayedDate(nextDate);
                setIncomingDate(null);
                return;
            }

            const prevTime = prevDate.getTime();
            const nextTime = nextDate.getTime();
            if (prevTime === nextTime) {
                // Still commit + reset, so the UI updates
                const committed = new Date(nextDate);
                committed.setHours(0, 0, 0, 0);

                setDisplayedDate(committed);
                setIncomingDate(null);
                return;
            }

            // Simply update the displayed date without animation
            setDisplayedDate(nextDate);
            setIncomingDate(null);
        },
        [displayedDate]
    );

    const handleOpenDatePicker = () => {
        const dateParam = selectedDate ? selectedDate.toISOString() : new Date().toISOString();
        router.push({
            pathname: '/modals/calendar/select-date-modal',
            params: { selectedDate: dateParam, storageKey: SELECTED_DATE_KEY },
        });
    };

    // Listen for when we return from the modal and check if date was updated
    useFocusEffect(
        useCallback(() => {
            const checkSelectedDate = () => {
                try {
                    const storedDate = Storage.getItem(SELECTED_DATE_KEY);
                    if (storedDate) {
                        const date = new Date(storedDate);
                        if (!isNaN(date.getTime())) {
                            date.setHours(0, 0, 0, 0);
                            animateCalendarForDateChange(date);
                            setSelectedDate(date);
                            setHasSelectedDate(true);
                            setCurrentMonth(date.getMonth());
                            setCurrentYear(date.getFullYear());
                            // Clear the stored date after reading it
                            Storage.removeItem(SELECTED_DATE_KEY);
                        }
                    }
                } catch (error) {
                    console.error('Failed to read selected date:', error);
                }
            };
            checkSelectedDate();
        }, [animateCalendarForDateChange])
    );

    const handleDateSelect = (date: Date) => {
        const newDate = new Date(date);
        newDate.setHours(0, 0, 0, 0);
        animateCalendarForDateChange(newDate);
        setSelectedDate(newDate);
        setHasSelectedDate(true);
        setCurrentMonth(newDate.getMonth());
        setCurrentYear(newDate.getFullYear());
        const formattedDate = formatDateDDMMYYYY(newDate);
        console.log('Selected date:', formattedDate);
    };

    const handleCalendarSwipe = (month: number, year: number) => {
        setCurrentMonth(month);
        setCurrentYear(year);
    };

    const displayText = useMemo(() => {
        const monthKeys = [
            'january', 'february', 'march', 'april', 'may', 'june',
            'july', 'august', 'september', 'october', 'november', 'december',
        ] as const;

        if (selectedDate) {
            const monthName = t(`calendar.months.${monthKeys[selectedDate.getMonth()]}`);
            const day = selectedDate.getDate();
            const yearShort = selectedDate.getFullYear().toString().slice(-2);
            return `${monthName} ${yearShort}`;
        }

        const monthName = t(`calendar.months.${monthKeys[currentMonth]}`);
        const yearShort = currentYear.toString().slice(-2);
        return `${monthName} ${yearShort}`;
    }, [selectedDate, currentMonth, currentYear, t]);

    const handleBackPress = () => {
        router.back();
    };

    const handlePlusPress = () => {
        // TODO: Handle plus press
    };

    const dropdownOptions = useMemo(() => [
        {
            label: t('clientDetail.actions.assignWorkout'),
            icon: { sf: 'figure.run', IconComponent: Dumbbell },
            onPress: () => {
                router.push('/modals/shared/assign-to-clients-modal?type=workout');
            }
        },
        {
            label: t('clientDetail.actions.addWorkout'),
            icon: { sf: 'plus.circle', IconComponent: Plus },
            onPress: () => {
                router.push('/modals/library/add-workout-modal');
            }
        }
    ], [t, router]);

    return (
        <ScreenWrapper>
            <View style={[styles.header, { backgroundColor: themeColors.pageBackground }]}>
                <IconButton
                    icon={{ sf: 'chevron.left', IconComponent: ChevronLeft }}
                    onPress={handleBackPress}
                    size="md"
                    color={iconColor}
                />
                <PressableOpacity
                    style={styles.dateButton}
                    onPress={handleOpenDatePicker}
                >
                    <Text style={[styles.dateButtonText, { color: themeColors.text }]}>{displayText}</Text>
                    <PlatformIcon
                        sf="chevron.down"
                        IconComponent={ChevronDown}
                        size={iconSizes.navigationChevrons} // Smaller chevron for header
                        color={themeColors.text}
                    />
                </PressableOpacity>
                <DropdownMenuWrapper options={dropdownOptions}>
                    <IconButton
                        icon={{ sf: 'plus', IconComponent: Plus }}
                        onPress={() => { }}
                        size="md"
                        color={iconColor}
                    />
                </DropdownMenuWrapper>
            </View>

            {/* Bottom row: Swipeable Calendar */}
            <View style={styles.headerBottomRow}>
                <SwipeableCalendar
                    key={calendarKey}
                    initialSelectedDate={selectedDate || undefined}
                    onDateSelect={handleDateSelect}
                    onSwipe={handleCalendarSwipe}
                />
            </View>

            <View style={styles.staticHeader}>
                <View style={[styles.divider, { backgroundColor: themeColors.mutedText, opacity: 0.3 }]} />
            </View>

            <View style={styles.content}>
                <Text style={{ color: themeColors.mutedText }}>{t('clientDetail.trainingPlaceholder')}</Text>
            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 4,
        paddingBottom: 8,
        paddingHorizontal: 16,
    },
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    dateButtonText: {
        ...typography.h5,
        textAlign: 'center',
    },
    headerBottomRow: {
        width: '100%',
        alignSelf: 'stretch',
    },
    staticHeader: {
        width: '100%',
    },
    divider: {
        width: '100%',
        height: 1,
        alignSelf: 'stretch',
        marginTop: 0,
    },
    content: {
        paddingHorizontal: 16,
        paddingVertical: 16,
        flex: 1,
        alignItems: 'center', // Center the "coming soon" text for now
    },
});
