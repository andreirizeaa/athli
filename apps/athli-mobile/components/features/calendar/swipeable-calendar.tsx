import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PressableOpacity } from 'pressto';
import SquircleView from 'react-native-fast-squircle';
import PagerView, { type PagerViewOnPageSelectedEvent } from 'react-native-pager-view';

import { useThemePreference, useColorScheme } from '@/stores';
import { useTranslations } from '@/stores';
import { typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';

const WEEK_HEIGHT = 90;

interface SwipeableCalendarProps {
  onDateSelect?: (date: Date) => void;
  onSwipe?: (month: number, year: number) => void;
  selectedDate: Date;
}

interface DayData {
  date: Date;
  dayName: string;
  dayNumber: string;
  isToday: boolean;
  isActive: boolean;
  isFuture: boolean;
  isCurrentMonth: boolean;
}

// Normalize date to start of day for comparison
const normalizeDate = (date: Date): Date => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

// Get Monday of the week containing the given date
const getMondayOfWeek = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};

// Get Sunday of the week containing the given date
const getSundayOfWeek = (date: Date): Date => {
  const monday = getMondayOfWeek(date);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return sunday;
};

// Generate the 7 days of a week starting from Monday
const getWeekDays = (monday: Date): Date[] => {
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    date.setHours(0, 0, 0, 0);
    days.push(date);
  }
  return days;
};

// Generate weeks for a specific month (including partial weeks at edges)
const generateMonthWeeks = (year: number, month: number): Date[] => {
  const weeks: Date[] = [];
  
  // First day of the month
  const firstOfMonth = new Date(year, month, 1);
  firstOfMonth.setHours(0, 0, 0, 0);
  
  // Last day of the month
  const lastOfMonth = new Date(year, month + 1, 0);
  lastOfMonth.setHours(0, 0, 0, 0);
  
  // Get Monday of the week containing the first day
  const startMonday = getMondayOfWeek(firstOfMonth);
  
  // Get Sunday of the week containing the last day
  const endSunday = getSundayOfWeek(lastOfMonth);
  
  // Generate all weeks
  let current = new Date(startMonday);
  while (current.getTime() <= endSunday.getTime()) {
    weeks.push(new Date(current));
    current.setDate(current.getDate() + 7);
  }
  
  return weeks;
};

// Component for rendering a single week
interface WeekPageProps {
  monday: Date;
  selectedDate: Date;
  currentMonth: number;
  dayAcronyms: string[];
  onDatePress: (day: DayData) => void;
  themeColors: any;
  isLightMode: boolean;
  pillBackgroundColor: string;
}

const WeekPage = React.memo(({
  monday,
  selectedDate,
  currentMonth,
  dayAcronyms,
  onDatePress,
  themeColors,
  isLightMode,
  pillBackgroundColor,
}: WeekPageProps) => {
  const today = normalizeDate(new Date());
  const todayTime = today.getTime();
  const selectedTime = selectedDate.getTime();
  const days = getWeekDays(monday);

  const weekDays: DayData[] = days.map((date, i) => {
    const dateTime = date.getTime();
    const isCurrentMonth = date.getMonth() === currentMonth;

    return {
      date,
      dayName: dayAcronyms[i],
      dayNumber: date.getDate().toString(),
      isToday: dateTime === todayTime,
      isActive: dateTime === selectedTime,
      isFuture: dateTime > todayTime,
      isCurrentMonth,
    };
  });

  // Get pill style based on state
  const getActivePillStyle = (isActive: boolean, isToday: boolean) => {
    if (!isActive && !isToday) return {};

    const baseStyle: any = {
      backgroundColor: pillBackgroundColor,
      ...(isLightMode && {
        borderColor: themeColors.cardSecondary,
        borderWidth: 0.5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 3,
      }),
    };

    if (isToday && !isActive) {
      baseStyle.opacity = 0.5;
    }

    return baseStyle;
  };

  return (
    <View style={styles.weekContent}>
      {weekDays.map((day, i) => (
        <PressableOpacity
          key={`${day.date.getTime()}-${i}`}
          style={styles.dayContainer}
          onPress={() => onDatePress(day)}
        >
          <SquircleView
            style={[
              styles.dayPill,
              getActivePillStyle(day.isActive, day.isToday),
            ]}
            cornerSmoothing={1}
          >
            <Text
              style={[
                styles.dayAcronym,
                {
                  color: day.isActive ? themeColors.text : themeColors.mutedText,
                  opacity: day.isCurrentMonth 
                    ? (day.isActive ? 1 : (day.isFuture ? 0.3 : 0.7))
                    : 0.2,
                  fontWeight: day.isActive ? '600' : '500',
                },
              ]}
            >
              {day.dayName}
            </Text>
            <View
              style={[
                styles.dayCircle,
                {
                  borderColor: themeColors.mutedText,
                  borderStyle: day.isFuture || day.isToday ? 'solid' : 'dashed',
                  opacity: day.isCurrentMonth 
                    ? (day.isActive ? 1 : (day.isFuture ? 0.3 : 0.5))
                    : 0.2,
                },
              ]}
            >
              <Text
                style={[
                  styles.dayNumber,
                  day.isActive
                    ? { color: themeColors.text, fontWeight: '600' }
                    : { color: day.isFuture ? themeColors.mutedText : themeColors.text },
                  !day.isCurrentMonth && { opacity: 0.3 },
                ]}
              >
                {day.dayNumber}
              </Text>
            </View>
          </SquircleView>
        </PressableOpacity>
      ))}
    </View>
  );
});

export const SwipeableCalendar = ({
  onDateSelect,
  onSwipe,
  selectedDate,
}: SwipeableCalendarProps) => {
  const { colors: themeColors } = useThemePreference();
  const colorScheme = useColorScheme();
  const isLightMode = colorScheme === 'light';
  const { t } = useTranslations();

  // Normalize the selected date
  const normalizedSelectedDate = useMemo(() => {
    return normalizeDate(selectedDate);
  }, [selectedDate]);

  // Get the current month/year from selected date
  const currentMonth = normalizedSelectedDate.getMonth();
  const currentYear = normalizedSelectedDate.getFullYear();

  // Generate weeks for the current month
  const weeksArray = useMemo(() => {
    return generateMonthWeeks(currentYear, currentMonth);
  }, [currentYear, currentMonth]);

  // Find the index of the week containing the selected date
  const selectedWeekIndex = useMemo(() => {
    const selectedMonday = getMondayOfWeek(normalizedSelectedDate);
    const selectedMondayTime = selectedMonday.getTime();
    
    for (let i = 0; i < weeksArray.length; i++) {
      if (weeksArray[i].getTime() === selectedMondayTime) {
        return i;
      }
    }
    
    return 0;
  }, [normalizedSelectedDate, weeksArray]);

  // Get day name abbreviations
  const dayAcronyms = useMemo(() => {
    return [
      t('calendar.days.monday'),
      t('calendar.days.tuesday'),
      t('calendar.days.wednesday'),
      t('calendar.days.thursday'),
      t('calendar.days.friday'),
      t('calendar.days.saturday'),
      t('calendar.days.sunday'),
    ].map((d) => d?.trim()?.slice(0, 3) ?? '');
  }, [t]);

  // Handle day press - notify parent
  const handleDatePress = useCallback((day: DayData) => {
    onDateSelect?.(day.date);
  }, [onDateSelect]);

  // Handle week swipe - just for haptic feedback
  const handlePageSelected = useCallback((event: PagerViewOnPageSelectedEvent) => {
    const weekIndex = event.nativeEvent.position;
    const weekMonday = weeksArray[weekIndex];

    if (!weekMonday) return;

    // User swiped - provide haptic feedback
    haptics.selection();

    // Notify parent of month/year (for display purposes)
    const midWeek = new Date(weekMonday);
    midWeek.setDate(weekMonday.getDate() + 3);
    onSwipe?.(midWeek.getMonth(), midWeek.getFullYear());
  }, [weeksArray, onSwipe]);

  // Pill background color
  const pillBackgroundColor = isLightMode ? '#FFFFFF' : themeColors.surfacePrimary;

  return (
    <View style={styles.container}>
      <PagerView
        key={`${currentYear}-${currentMonth}`}
        style={styles.pager}
        initialPage={selectedWeekIndex}
        onPageSelected={handlePageSelected}
        offscreenPageLimit={1}
      >
        {weeksArray.map((monday) => (
          <View key={`week-${monday.getTime()}`} style={styles.weekPage} collapsable={false}>
            <WeekPage
              monday={monday}
              selectedDate={normalizedSelectedDate}
              currentMonth={currentMonth}
              dayAcronyms={dayAcronyms}
              onDatePress={handleDatePress}
              themeColors={themeColors}
              isLightMode={isLightMode}
              pillBackgroundColor={pillBackgroundColor}
            />
          </View>
        ))}
      </PagerView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    marginTop: 4,
    width: '100%',
    height: WEEK_HEIGHT,
  },
  pager: {
    flex: 1,
  },
  weekPage: {
    flex: 1,
    justifyContent: 'center',
  },
  weekContent: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  dayContainer: {
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  dayAcronym: {
    ...typography.p3,
    marginBottom: 8,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 17,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPill: {
    width: 48,
    height: 76,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 10,
  },
  dayNumber: {
    ...typography.h6,
  },
});
