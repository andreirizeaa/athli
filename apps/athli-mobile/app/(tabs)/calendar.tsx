import React, { useState, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronDown } from 'lucide-react-native';

import { typography, iconSizes } from '@/constants/typography';
import { useColorScheme, useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { PlatformIcon } from '@/components/platform-icon';
import { SelectDateModal } from '@/components/calendar/select-date-modal';
import { SwipeableCalendar } from '@/components/calendar/swipeable-calendar';
import { FilledButton } from '@/components/buttons/filled-button';
import { formatDateDDMMYYYY } from '@/lib/utils/date-formatters';

export default function CalendarScreen() {
  const colorScheme = useColorScheme();
  const { primaryColor, primarySoftColor, colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
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
    setIsDatePickerVisible(true);
  };

  const handleCloseDatePicker = () => {
    setIsDatePickerVisible(false);
  };

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

  return (
    <LinearGradient
      colors={gradientColors}
      locations={[0.05, 0.7]}
      style={styles.gradient}
      start={{ x: 1, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
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
            <FilledButton
              label={t('calendar.today')}
              onPress={handleTodayPress}
              style={styles.todayButton}
              textStyle={styles.todayButtonText}
            />
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
        </View>
      </SafeAreaView>
      <SelectDateModal
        visible={isDatePickerVisible}
        onClose={handleCloseDatePicker}
        selectedDate={selectedDate}
        onDateSelect={handleDateSelect}
      />
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
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
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
    marginBottom: 0,
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
    flex: 0,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  todayButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
