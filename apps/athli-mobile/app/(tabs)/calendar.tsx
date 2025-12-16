import React, { useState, useMemo, useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChevronDown, CalendarCheck } from 'lucide-react-native';

import { typography, iconSizes } from '@/constants/typography';
import { useColorScheme, useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { PlatformIcon } from '@/components/platform-icon';
import { SwipeableCalendar } from '@/components/calendar/swipeable-calendar';
import { TimeGrid } from '@/components/calendar/time-grid';
import { formatDateDDMMYYYY } from '@/lib/utils/date-formatters';

const SELECTED_DATE_KEY = '@select_date_modal_selected_date';

export default function CalendarScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { primaryColor, primarySoftColor, colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [hasSelectedDate, setHasSelectedDate] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [calendarKey, setCalendarKey] = useState(0); // Key to force calendar reset

  const gradientColors: [string, string] =
    colorScheme === 'dark'
      ? ['#2a2a2a', themeColors.pageBackground]
      : [primarySoftColor, themeColors.pageBackground];

  const handleOpenDatePicker = () => {
    const dateParam = selectedDate ? selectedDate.toISOString() : new Date().toISOString();
    router.push({
      pathname: '/select-date-modal',
      params: { selectedDate: dateParam },
    });
  };

  // Listen for when we return from the modal and check if date was updated
  useFocusEffect(
    useCallback(() => {
      const checkSelectedDate = async () => {
        try {
          const storedDate = await AsyncStorage.getItem(SELECTED_DATE_KEY);
          if (storedDate) {
            const date = new Date(storedDate);
            if (!isNaN(date.getTime())) {
              date.setHours(0, 0, 0, 0);
              setSelectedDate(date);
              setHasSelectedDate(true);
              setCurrentMonth(date.getMonth());
              setCurrentYear(date.getFullYear());
              // Clear the stored date after reading it
              await AsyncStorage.removeItem(SELECTED_DATE_KEY);
            }
          }
        } catch (error) {
          console.error('Failed to read selected date:', error);
        }
      };
      checkSelectedDate();
    }, [])
  );

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setHasSelectedDate(true);
    // Update month and year to reflect the selected date
    setCurrentMonth(date.getMonth());
    setCurrentYear(date.getFullYear());
    // Save date in dd-mm-yyyy format (you can add AsyncStorage here if needed)
    const formattedDate = formatDateDDMMYYYY(date);
    console.log('Selected date:', formattedDate);
    // TODO: Save to storage if needed
  };

  const handleCalendarSwipe = (month: number, year: number) => {
    setCurrentMonth(month);
    setCurrentYear(year);
  };

  const handleTodayPress = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setSelectedDate(today);
    setHasSelectedDate(true);
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    // Force calendar to reset by updating key
    setCalendarKey((prev) => prev + 1);
  };

  const displayText = useMemo(() => {
    const monthKeys = [
      'january',
      'february',
      'march',
      'april',
      'may',
      'june',
      'july',
      'august',
      'september',
      'october',
      'november',
      'december',
    ] as const;

    // If a date is selected, show the exact selected date
    if (selectedDate) {
      const monthName = t(`calendar.months.${monthKeys[selectedDate.getMonth()]}`);
      const day = selectedDate.getDate();
      const yearShort = selectedDate.getFullYear().toString().slice(-2);
      return `${monthName} ${yearShort}`;
    }

    // Fallback: show the currently visible month/year from the swipeable calendar
    const monthName = t(`calendar.months.${monthKeys[currentMonth]}`);
    const yearShort = currentYear.toString().slice(-2);
    return `${monthName} ${yearShort}`;
  }, [selectedDate, currentMonth, currentYear, t]);

  // Get current day number for SF Symbol
  const currentDayNumber = useMemo(() => {
    const today = new Date();
    return today.getDate();
  }, []);

  // Button colors: always white background with black icon
  const buttonBackgroundColor = '#FFFFFF';
  const buttonIconColor = '#000000';


  return (
    <LinearGradient
      colors={gradientColors}
      locations={[0.05, 0.7]}
      style={styles.gradient}
      start={{ x: 1, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <View
        style={[
          styles.safeArea,
          {
            paddingTop: insets.top,
            paddingBottom: 0,
            paddingLeft: insets.left,
            paddingRight: insets.right,
          },
        ]}
      >
        <View style={styles.container}>
          {/* Top row: Date picker and Today button */}
          <View style={styles.headerTopRow}>
            <TouchableOpacity
              style={styles.dateButton}
              activeOpacity={0.7}
              onPress={handleOpenDatePicker}
            >
              <Text style={[styles.dateButtonText, { color: themeColors.text }]}>{displayText}</Text>
              <PlatformIcon
                sf="chevron.down"
                IconComponent={ChevronDown}
                size={iconSizes.navigationChevrons}
                color={themeColors.text}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.todayButton, { backgroundColor: buttonBackgroundColor }]}
              activeOpacity={0.7}
              onPress={handleTodayPress}
            >
              <PlatformIcon
                sf={`calendar`}
                IconComponent={CalendarCheck}
                size={iconSizes.navigationChevrons + 4}
                color={buttonIconColor}
              />
            </TouchableOpacity>
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
          <View style={[styles.divider, { backgroundColor: themeColors.mutedText, opacity: 0.3 }]} />
          
          {/* Time Grid - Scrollable */}
          <TimeGrid selectedDate={selectedDate} />
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingTop: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 0,
    width: '100%',
  },
  headerBottomRow: {
    width: '100%',
    alignSelf: 'stretch',
  },
  divider: {
    width: '100%',
    height: 1,
    alignSelf: 'stretch',
    marginTop: 4,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateButtonText: {
    ...typography.h1,
    textAlign: 'left',
  },
  todayButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 22,
  },
});
