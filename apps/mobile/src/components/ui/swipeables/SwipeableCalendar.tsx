import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Svg, { Circle } from 'react-native-svg';
import { useUserCheckIns } from '../../../context/UserCheckInsContext';
import { useSelectedDate } from '../../../context/SelectedDateContext';
import { useLiftData } from '../../../context/LiftDataContext';
import { BASE_WEEKS, INITIAL_INDEX } from '../../../utils/calendarData';
import i18n from '../../../utils/i18n';

const { width: RAW_W } = Dimensions.get('window');
const SCREEN_WIDTH = Math.round(RAW_W);
const ITEM_WIDTH = SCREEN_WIDTH; // page width
const WEEK_HEIGHT = 80;
const WEEK_WIDTH = Math.round(SCREEN_WIDTH * 0.95);

interface SwipeableCalendarProps {
  onDateSelect?: (date: Date) => void;
  onSwipe?: () => void;
  initialSelectedDate?: Date;
  externalScrollGestureRef?: React.RefObject<any>;
}

interface DayData {
  date: Date;
  dayName: string;
  dayNumber: string;
  isToday: boolean;
  isActive: boolean;
  isLogged: boolean;
  isFuture: boolean;
  dailyAccuracy: number;
}

// CircularProgress component
const CircularProgress = ({
  percentage,
  size = 36,
  strokeWidth = 2,
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <Svg width={size} height={size} style={{ position: 'absolute' }}>
      {/* Progress circle only - no background circle */}
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="#000000"
        strokeWidth={strokeWidth}
        fill="transparent"
        strokeDasharray={strokeDasharray}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
};

// Memoized WeekPage Component with lazy rendering
const WeekPage = React.memo(
  function WeekPage({
    days,
    onPressDay,
    shouldRender,
  }: {
    days: DayData[];
    onPressDay: (d: DayData) => void;
    shouldRender: boolean;
  }) {
    return (
      <View style={styles.weekPage} renderToHardwareTextureAndroid shouldRasterizeIOS>
        <View style={styles.weekContent}>
          {days.map((day, i) => (
            <TouchableOpacity
              key={`${day.date.toISOString()}-${i}`}
              style={styles.dayContainer}
              onPress={() => !day.isFuture && onPressDay(day)}
              activeOpacity={day.isFuture ? 1 : 0.7}
              disabled={day.isFuture}
            >
              <View
                style={[
                  styles.dayWrapper,
                  day.isActive && styles.selectedDayWrapper,
                  day.isToday && !day.isActive && styles.todayWrapper,
                ]}
              >
                {/* Day acronym above the circle */}
                <Text
                  style={[
                    styles.dayAcronym,
                    day.isActive ? styles.activeDayAcronym : styles.inactiveDayAcronym,
                  ]}
                >
                  {day.dayName}
                </Text>

                <View
                  style={[
                    styles.dayCircle,
                    // Hide entire day circle background when has lifts or for future dates
                    day.dailyAccuracy > 0 || day.isFuture
                      ? styles.transparentCircle
                      : day.isActive
                        ? day.dailyAccuracy === 0
                          ? styles.inactiveDayCircle
                          : styles.selectedCircle
                        : styles.inactiveDayCircle,
                  ]}
                >
                  {/* Circular progress indicator for days with lifts - only render when visible AND needed */}
                  {shouldRender && day.dailyAccuracy > 0 && (
                    <CircularProgress percentage={day.dailyAccuracy} size={36} strokeWidth={2} />
                  )}
                  {/* Day number inside the circle */}
                  <Text
                    style={[
                      styles.dayNumber,
                      day.isActive
                        ? styles.activeDayText
                        : day.isFuture
                          ? styles.inactiveDayText
                          : styles.pastDayText,
                    ]}
                  >
                    {day.dayNumber}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  },
  (a, b) =>
    a.shouldRender === b.shouldRender &&
    a.days.length === b.days.length &&
    a.days.every(
      (day, i) =>
        day.date.toISOString() === b.days[i]?.date.toISOString() &&
        day.isActive === b.days[i]?.isActive &&
        day.dailyAccuracy === b.days[i]?.dailyAccuracy
    )
);

export function SwipeableCalendar({
  onDateSelect,
  onSwipe,
  initialSelectedDate,
}: SwipeableCalendarProps) {
  // hooks (unchanged)
  const { selectedDate, setSelectedDate } = useSelectedDate();
  const { daysLogged } = useUserCheckIns();
  const { getLiftsByDate } = useLiftData();

  const listRef = useRef<FlashList<DayData[]> | null>(null);
  const hasMounted = useRef(false);

  // Seed indices from selected date (or initialSelectedDate) before first paint
  const initialIndexRef = useRef<number>(0);

  // compute once (selectedDate fallback if prop is absent)
  if (initialIndexRef.current === 0 && BASE_WEEKS.length) {
    const seedDate = initialSelectedDate ?? selectedDate;
    const t = seedDate.toDateString();
    for (let i = 0; i < BASE_WEEKS.length; i++) {
      if (BASE_WEEKS[i].some((d) => d.toDateString() === t)) {
        initialIndexRef.current = i;
        break;
      }
    }
    if (initialIndexRef.current === 0) {
      initialIndexRef.current = BASE_WEEKS.length - 1;
    }
  }

  const [currentWeekIndex, setCurrentWeekIndex] = useState(initialIndexRef.current);
  const [localIndex, setLocalIndex] = useState(initialIndexRef.current);

  useEffect(() => {
    if (initialSelectedDate && initialSelectedDate.toDateString() !== selectedDate.toDateString()) {
      setSelectedDate(initialSelectedDate);
    }
  }, [initialSelectedDate, selectedDate, setSelectedDate]);

  const formatDateAsDDMMYYYY = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const calculateDailyAccuracy = (date: Date): number => {
    const liftsForDate = getLiftsByDate(date);
    if (liftsForDate.length === 0) return 0;
    const totalAccuracy = liftsForDate.reduce((sum, lift) => sum + lift.analysis.accuracy, 0);
    return Math.round(totalAccuracy / liftsForDate.length);
  };

  const generateWeekData = useCallback(
    (weekDates: Date[]): DayData[] => {
      const today = new Date();
      const dayAcronyms = [
        i18n.t('days.sunday'),
        i18n.t('days.monday'),
        i18n.t('days.tuesday'),
        i18n.t('days.wednesday'),
        i18n.t('days.thursday'),
        i18n.t('days.friday'),
        i18n.t('days.saturday'),
      ];

      return weekDates.map((date, i) => {
        const isToday = date.toDateString() === today.toDateString();
        const isSelected = date.toDateString() === selectedDate.toDateString();
        const isFuture = date > today;
        const formattedDate = formatDateAsDDMMYYYY(date);
        const isLogged = daysLogged.includes(formattedDate);
        const dailyAccuracy = calculateDailyAccuracy(date);

        return {
          date,
          dayName: dayAcronyms[i],
          dayNumber: date.getDate().toString(),
          isToday,
          isActive: isSelected,
          isLogged,
          isFuture,
          dailyAccuracy,
        };
      });
    },
    [selectedDate, daysLogged, getLiftsByDate]
  );

  const weeks: DayData[][] = useMemo(
    () => BASE_WEEKS.map((dates) => generateWeekData(dates)),
    [generateWeekData]
  );

  const getWeekIndexForDate = useCallback((targetDate: Date) => {
    const t = targetDate.toDateString();
    for (let i = 0; i < BASE_WEEKS.length; i++) {
      if (BASE_WEEKS[i].some((d) => d.toDateString() === t)) return i;
    }
    return BASE_WEEKS.length - 1;
  }, []);

  // When the selected date changes externally, compute the week index
  useEffect(() => {
    const idx = Math.max(0, Math.min(weeks.length - 1, getWeekIndexForDate(selectedDate)));
    setCurrentWeekIndex(idx); // committed index
    setLocalIndex(idx); // keep local window in sync
  }, [selectedDate, getWeekIndexForDate, weeks.length]);

  // later changes (e.g., tapping a date or external selectedDate updates)
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    listRef.current?.scrollToIndex({ index: currentWeekIndex, animated: true });
  }, [currentWeekIndex]);

  // (Optional) If initialSelectedDate can arrive late
  useEffect(() => {
    if (!initialSelectedDate) return;
    const idx = getWeekIndexForDate(initialSelectedDate);
    setCurrentWeekIndex(idx);
    setLocalIndex(idx);
    listRef.current?.scrollToIndex({ index: idx, animated: false });
  }, [initialSelectedDate, getWeekIndexForDate]);

  const handleDatePress = (day: DayData) => {
    if (day.isFuture) return;
    setSelectedDate(day.date);
    onDateSelect?.(day.date);
  };

  // 🔥 lazy window uses localIndex (same as working components)
  const shouldRenderIndex = useCallback(
    (index: number) => Math.abs(index - localIndex) <= 1,
    [localIndex]
  );

  // Follow finger smoothly — local only
  const onScroll = useCallback(
    (e: any) => {
      const x = e?.nativeEvent?.contentOffset?.x || 0;
      const idx = Math.max(
        0,
        Math.min(Math.floor((x + ITEM_WIDTH / 2) / ITEM_WIDTH), weeks.length - 1)
      );
      if (idx !== localIndex) setLocalIndex(idx);
    },
    [localIndex, weeks.length]
  );

  // Commit page on settle
  const onMomentumScrollEnd = useCallback(
    (e: any) => {
      const x = e?.nativeEvent?.contentOffset?.x ?? 0;
      const idx = Math.max(0, Math.min(Math.round(x / ITEM_WIDTH), weeks.length - 1));
      if (idx !== currentWeekIndex) {
        setCurrentWeekIndex(idx);
        // Track calendar swipe
        onSwipe?.();
      }
      if (idx !== localIndex) setLocalIndex(idx);
    },
    [weeks.length, currentWeekIndex, localIndex, onSwipe]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: DayData[]; index: number }) => (
      <View style={{ width: ITEM_WIDTH, alignItems: 'center' }}>
        <WeekPage
          days={item}
          onPressDay={handleDatePress}
          shouldRender={shouldRenderIndex(index)}
        />
      </View>
    ),
    [shouldRenderIndex]
  );

  return (
    <View style={styles.container}>
      <FlashList
        ref={listRef}
        data={weeks}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        // ✅ same snap mode as the fixed components
        snapToInterval={ITEM_WIDTH}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        contentInsetAdjustmentBehavior="never"
        // exact layout (size + offset) so FlashList never guesses
        overrideItemLayout={(layout, index) => {
          layout.size = ITEM_WIDTH;
          // @ts-ignore
          layout.offset = ITEM_WIDTH * index;
        }}
        estimatedItemSize={ITEM_WIDTH}
        estimatedListSize={{ width: SCREEN_WIDTH, height: WEEK_HEIGHT }}
        keyExtractor={(_, i) => `week-${i}`}
        renderItem={renderItem}
        removeClippedSubviews
        nestedScrollEnabled
        // smooth UI updates while dragging; no parent/committed state churn
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={onMomentumScrollEnd}
        // re-render cells when selection/logs or local window change
        extraData={{ selectedDate, daysLogged, localIndex }}
        initialScrollIndex={initialIndexRef.current}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    marginBottom: 10,
  },
  weekPage: {
    width: SCREEN_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
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
  dayWrapper: {
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 2,
  },
  selectedDayWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 7,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  todayWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 20,
    paddingHorizontal: 7,
    borderWidth: 1,
    borderColor: '#F5F5F5',
  },
  dayAcronym: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    marginBottom: 8,
  },
  activeDayAcronym: {
    color: '#000000',
    fontWeight: '700',
  },
  inactiveDayAcronym: {
    color: '#9CA3AF',
    fontWeight: '600',
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  inactiveDayCircle: {
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  selectedCircle: {
    borderWidth: 2,
    borderColor: '#000000',
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  transparentCircle: {
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  inactiveDayText: {
    color: '#9CA3AF',
    fontWeight: '600',
  },
  pastDayText: {
    color: '#000000',
    fontWeight: '600',
  },
  activeDayText: {
    color: '#000000',
    fontWeight: '600',
  },
});
