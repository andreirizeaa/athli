import React, { useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PressableOpacity } from 'pressto';
import SquircleView from 'react-native-fast-squircle';

import { useThemePreference, useColorScheme } from '@/stores';
import { useTranslations } from '@/stores';
import { typography } from '@/constants/typography';

const WEEK_HEIGHT = 90;

interface SwipeableCalendarProps {
  onDateSelect?: (date: Date) => void;
  onSwipe?: (month: number, year: number) => void;
  initialSelectedDate?: Date;
  minDate?: Date;
  maxDate?: Date;
}

interface DayData {
  date: Date;
  dayName: string;
  dayNumber: string;
  isToday: boolean;
  isActive: boolean;
  isFuture: boolean;
  isWithinRange: boolean;
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
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  return new Date(d.setDate(diff));
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

export const SwipeableCalendar = ({
  onDateSelect,
  onSwipe,
  initialSelectedDate,
  minDate,
  maxDate,
}: SwipeableCalendarProps) => {
  const { colors: themeColors } = useThemePreference();
  const colorScheme = useColorScheme();
  const isLightMode = colorScheme === 'light';
  const { t } = useTranslations();

  // Normalize the selected date from parent - this is the SOURCE OF TRUTH
  const selectedDate = useMemo(() => {
    if (initialSelectedDate) {
      return normalizeDate(initialSelectedDate);
    }
    return normalizeDate(new Date());
  }, [initialSelectedDate]);

  // Normalize min/max dates
  const normalizedMinDate = useMemo(() => {
    return minDate ? normalizeDate(minDate) : null;
  }, [minDate]);

  const normalizedMaxDate = useMemo(() => {
    return maxDate ? normalizeDate(maxDate) : null;
  }, [maxDate]);

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

  // Get the week containing the selected date
  const weekDays = useMemo((): DayData[] => {
    const today = normalizeDate(new Date());
    const todayTime = today.getTime();
    const selectedTime = selectedDate.getTime();
    const monday = getMondayOfWeek(selectedDate);
    const days = getWeekDays(monday);

    return days.map((date, i) => {
      const dateTime = date.getTime();
      
      // Check if within min/max range
      let isWithinRange = true;
      if (normalizedMinDate && dateTime < normalizedMinDate.getTime()) {
        isWithinRange = false;
      }
      if (normalizedMaxDate && dateTime > normalizedMaxDate.getTime()) {
        isWithinRange = false;
      }

      return {
        date,
        dayName: dayAcronyms[i],
        dayNumber: date.getDate().toString(),
        isToday: dateTime === todayTime,
        isActive: dateTime === selectedTime,
        isFuture: dateTime > todayTime,
        isWithinRange,
      };
    });
  }, [selectedDate, dayAcronyms, normalizedMinDate, normalizedMaxDate]);

  // Notify parent of month/year when selected date changes
  useEffect(() => {
    if (onSwipe) {
      onSwipe(selectedDate.getMonth(), selectedDate.getFullYear());
    }
  }, [selectedDate, onSwipe]);

  // Handle day press - notify parent
  const handleDatePress = useCallback((day: DayData) => {
    if (!day.isWithinRange) return;
    onDateSelect?.(day.date);
  }, [onDateSelect]);

  // Pill background color
  const pillBackgroundColor = isLightMode ? '#FFFFFF' : themeColors.surfacePrimary;

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
    <View style={styles.container}>
      <View style={styles.weekContent}>
        {weekDays.map((day, i) => (
          <PressableOpacity
            key={`${day.date.getTime()}-${i}`}
            style={styles.dayContainer}
            onPress={() => handleDatePress(day)}
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
                    opacity: day.isWithinRange 
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
                    opacity: day.isWithinRange 
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
                    !day.isWithinRange && { opacity: 0.3 },
                  ]}
                >
                  {day.dayNumber}
                </Text>
              </View>
            </SquircleView>
          </PressableOpacity>
        ))}
      </View>
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
