import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { Check } from 'lucide-react-native';
import { useUserCheckIns } from '../../context/UserCheckInsContext';
import { BASE_WEEKS } from '../../utils/calendarData';
import i18n from '../../utils/i18n';

const { width: RAW_W } = Dimensions.get('window');
const SCREEN_WIDTH = Math.round(RAW_W);
const WEEK_WIDTH = Math.round(SCREEN_WIDTH * 0.75);
const WEEK_HEIGHT = 70;

interface StreakCalendarProps {
  onDateSelect?: (date: Date) => void;
  circleRadius?: number;
  iconSize?: number;
}

interface DayData {
  date: Date;
  dayName: string;
  dayNumber: string;
  isActive: boolean;
  hasStreak: boolean;
  isFuture: boolean;
}

// Current week component for streak calendar
function CurrentWeek({
  days,
  onPressDay,
  circleRadius = 18,
  iconSize = 14,
}: {
  days: DayData[];
  onPressDay: (d: DayData) => void;
  circleRadius?: number;
  iconSize?: number;
}) {
  return (
    <View style={styles.weekContent}>
      {days.map((day, i) => (
        <TouchableOpacity
          key={`${day.date.toISOString()}-${i}`}
          style={styles.dayContainer}
          onPress={() => !day.isFuture && onPressDay(day)}
          activeOpacity={day.isFuture ? 1 : 0.7}
          disabled={day.isFuture}
        >
          <Text
            style={[styles.dayName, day.hasStreak ? styles.streakDayText : styles.defaultDayText]}
          >
            {day.dayName}
          </Text>
          <View
            style={[
              styles.dayCircle,
              {
                width: circleRadius * 2,
                height: circleRadius * 2,
                borderRadius: circleRadius,
                backgroundColor: day.hasStreak ? '#ed694a' : '#F0F0F0',
              },
            ]}
          >
            {day.hasStreak && <Check size={iconSize} color="#FFFFFF" />}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function StreakCalendar({
  onDateSelect,
  circleRadius = 18,
  iconSize = 14,
}: StreakCalendarProps) {
  const { daysLogged } = useUserCheckIns();

  // Convert daysLogged to a Set for faster lookup
  const streakDaysSet = useMemo(() => {
    return new Set(
      daysLogged.map((dateStr) => {
        // Convert string date to Date object and then to date string for comparison
        const [day, month, year] = dateStr.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return date.toDateString();
      })
    );
  }, [daysLogged]);

  // Get current week (last week in BASE_WEEKS)
  const currentWeek = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return BASE_WEEKS[BASE_WEEKS.length - 1].map((date) => {
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const dayNames = [
        i18n.t('days.sunday'),
        i18n.t('days.monday'),
        i18n.t('days.tuesday'),
        i18n.t('days.wednesday'),
        i18n.t('days.thursday'),
        i18n.t('days.friday'),
        i18n.t('days.saturday'),
      ];
      const dayName = dayNames[dayOfWeek];
      const dayNumber = date.getDate().toString();
      const isActive = false;
      const hasStreak = streakDaysSet.has(date.toDateString());
      const isFuture = date > today;

      return {
        date,
        dayName,
        dayNumber,
        isActive,
        hasStreak,
        isFuture,
      };
    });
  }, [streakDaysSet]);

  const handlePressDay = (day: DayData) => {
    if (onDateSelect && !day.isFuture) {
      onDateSelect(day.date);
    }
  };

  return (
    <View style={styles.container}>
      <CurrentWeek
        days={currentWeek}
        onPressDay={handlePressDay}
        circleRadius={circleRadius}
        iconSize={iconSize}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  weekContent: {
    width: WEEK_WIDTH,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayContainer: {
    alignItems: 'center',
    flex: 1,
  },
  dayCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 5,
  },
  streakCircle: {
    backgroundColor: '#ed694a', // Orange color for streak days
  },
  noStreakCircle: {
    backgroundColor: '#F0F0F0', // Light gray color for no streak days
  },
  dayName: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    marginBottom: 8,
  },
  streakDayText: {
    color: '#ed694a', // Orange color for streak day text
    fontWeight: '800',
  },
  defaultDayText: {
    color: '#000000', // Black color for default day text
  },
});
