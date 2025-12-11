import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { FlashList, type FlashListRef } from '@shopify/flash-list';

import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { generateWeeks, getWeekIndexForDate, getWeekMonthYear } from '@/lib/utils/calendar-utils';

const { width: RAW_W } = Dimensions.get('window');
const SCREEN_WIDTH = Math.round(RAW_W);
const ITEM_WIDTH = SCREEN_WIDTH; // page width
const WEEK_HEIGHT = 80;
// Account for visual spacing (20px on each side = 40px total)
const CONTAINER_PADDING = 40;
// Calculate available width accounting for padding
// Use a bit less to ensure all 7 days fit comfortably
const WEEK_WIDTH = SCREEN_WIDTH - CONTAINER_PADDING;

interface SwipeableCalendarProps {
  onDateSelect?: (date: Date) => void;
  onSwipe?: (month: number, year: number) => void;
  initialSelectedDate?: Date;
}

interface DayData {
  date: Date;
  dayName: string;
  dayNumber: string;
  isToday: boolean;
  isActive: boolean;
  isFuture: boolean;
}

// Memoized WeekPage Component with lazy rendering
const WeekPage = React.memo(
  function WeekPage({
    days,
    onPressDay,
    shouldRender,
    themeColors,
  }: {
    days: DayData[];
    onPressDay: (d: DayData) => void;
    shouldRender: boolean;
    themeColors: any;
  }) {
    return (
      <View style={styles.weekPage} renderToHardwareTextureAndroid shouldRasterizeIOS>
        <View style={styles.weekContent}>
          {days.map((day, i) => (
            <TouchableOpacity
              key={`${day.date.toISOString()}-${i}`}
              style={styles.dayContainer}
              onPress={() => onPressDay(day)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.dayWrapper,
                  day.isActive && { backgroundColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 7, borderWidth: 1, borderColor: themeColors.border },
                  day.isToday && !day.isActive && { backgroundColor: themeColors.surfaceSecondary, borderRadius: 20, paddingHorizontal: 7, borderWidth: 1, borderColor: themeColors.border },
                ]}
              >
                {/* Day acronym above the circle */}
                <Text
                  style={[
                    styles.dayAcronym,
                    { color: day.isActive ? '#000000' : themeColors.mutedText },
                    day.isActive ? { fontWeight: '700' } : { fontWeight: '600' },
                  ]}
                >
                  {day.dayName}
                </Text>

                <View style={styles.dayCircle}>
                  {/* Day number inside the circle */}
                  <Text
                    style={[
                      styles.dayNumber,
                      { color: day.isActive ? '#000000' : themeColors.mutedText },
                      { fontWeight: '600' },
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
        day.isActive === b.days[i]?.isActive
    )
);

// Normalize date to start of day for comparison
const normalizeDate = (date: Date): Date => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  normalized.setMinutes(0, 0, 0);
  normalized.setSeconds(0, 0);
  normalized.setMilliseconds(0);
  return normalized;
};

export const SwipeableCalendar = ({
  onDateSelect,
  onSwipe,
  initialSelectedDate,
}: SwipeableCalendarProps) => {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  
  // Normalize initial date
  const normalizedInitialDate = useMemo(() => {
    if (initialSelectedDate) {
      return normalizeDate(initialSelectedDate);
    }
    return normalizeDate(new Date());
  }, [initialSelectedDate]);
  
  const [selectedDate, setSelectedDate] = useState<Date>(normalizedInitialDate);
  const listRef = useRef<FlashListRef<DayData[]> | null>(null);
  const hasMounted = useRef(false);

  // Generate weeks once
  const weeks = useMemo(() => generateWeeks(), []);

  // Seed initial index from selected date
  const initialIndexRef = useRef<number>(0);
  if (initialIndexRef.current === 0 && weeks.length) {
    initialIndexRef.current = getWeekIndexForDate(normalizedInitialDate, weeks);
  }

  const [currentWeekIndex, setCurrentWeekIndex] = useState(initialIndexRef.current);
  const [localIndex, setLocalIndex] = useState(initialIndexRef.current);

  // Update selected date when initialSelectedDate changes from parent
  useEffect(() => {
    if (initialSelectedDate) {
      const normalized = normalizeDate(initialSelectedDate);
      const currentNormalized = normalizeDate(selectedDate);
      if (normalized.getTime() !== currentNormalized.getTime()) {
        setSelectedDate(normalized);
      }
    }
  }, [initialSelectedDate, selectedDate]);

  const dayAcronyms = [
    t('calendar.days.monday'),
    t('calendar.days.tuesday'),
    t('calendar.days.wednesday'),
    t('calendar.days.thursday'),
    t('calendar.days.friday'),
    t('calendar.days.saturday'),
    t('calendar.days.sunday'),
  ];

  const generateWeekData = useCallback(
    (weekDates: Date[]): DayData[] => {
      const today = normalizeDate(new Date());

      return weekDates.map((date, i) => {
        const dateCopy = normalizeDate(date);
        const selectedNormalized = normalizeDate(selectedDate);
        
        const isToday = dateCopy.getTime() === today.getTime();
        const isSelected = dateCopy.getTime() === selectedNormalized.getTime();
        const isFuture = dateCopy.getTime() > today.getTime();

        return {
          date: dateCopy,
          dayName: dayAcronyms[i],
          dayNumber: dateCopy.getDate().toString(),
          isToday,
          isActive: isSelected,
          isFuture,
        };
      });
    },
    [selectedDate, dayAcronyms]
  );

  const weeksData: DayData[][] = useMemo(
    () => weeks.map((dates) => generateWeekData(dates)),
    [weeks, generateWeekData]
  );

  // When the selected date changes, compute the week index and scroll
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
    }
    
    const normalized = normalizeDate(selectedDate);
    const idx = Math.max(0, Math.min(weeks.length - 1, getWeekIndexForDate(normalized, weeks)));
    
    // Update indices if they changed
    setCurrentWeekIndex((prevIdx) => {
      if (prevIdx !== idx) {
        // Scroll to the correct week when index changes
        if (listRef.current) {
          setTimeout(() => {
            listRef.current?.scrollToIndex({ index: idx, animated: hasMounted.current });
          }, hasMounted.current ? 100 : 200);
        }
      }
      return idx;
    });
    setLocalIndex((prevIdx) => (prevIdx !== idx ? idx : prevIdx));
  }, [selectedDate, weeks.length]);

  // Initialize title on mount
  useEffect(() => {
    if (weeks.length > 0 && initialIndexRef.current < weeks.length) {
      const week = weeks[initialIndexRef.current];
      if (week) {
        const { month, year } = getWeekMonthYear(week);
        onSwipe?.(month, year);
      }
    }
  }, [weeks, onSwipe]);

  const handleDatePress = (day: DayData) => {
    const normalized = normalizeDate(day.date);
    setSelectedDate(normalized);
    onDateSelect?.(normalized);
  };

  // Lazy window uses localIndex
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
      if (idx !== localIndex) {
        setLocalIndex(idx);
        // Update title as user swipes
        const week = weeks[idx];
        if (week) {
          const { month, year } = getWeekMonthYear(week);
          onSwipe?.(month, year);
        }
      }
    },
    [localIndex, weeks, onSwipe]
  );

  // Commit page on settle
  const onMomentumScrollEnd = useCallback(
    (e: any) => {
      const x = e?.nativeEvent?.contentOffset?.x ?? 0;
      const idx = Math.max(0, Math.min(Math.round(x / ITEM_WIDTH), weeks.length - 1));
      if (idx !== currentWeekIndex) {
        setCurrentWeekIndex(idx);
        const week = weeks[idx];
        if (week) {
          const { month, year } = getWeekMonthYear(week);
          onSwipe?.(month, year);
        }
      }
      if (idx !== localIndex) setLocalIndex(idx);
    },
    [weeks.length, currentWeekIndex, localIndex, onSwipe, weeks]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: DayData[]; index: number }) => (
      <View style={styles.renderItemContainer}>
        <WeekPage
          days={item}
          onPressDay={handleDatePress}
          shouldRender={shouldRenderIndex(index)}
          themeColors={themeColors}
        />
      </View>
    ),
    [shouldRenderIndex, themeColors]
  );

  return (
    <View style={styles.container}>
      <FlashList
        ref={listRef}
        data={weeksData}
        horizontal
        style={styles.list}
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        snapToInterval={ITEM_WIDTH}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        contentInsetAdjustmentBehavior="never"
        overrideItemLayout={(layout, index) => {
          // @ts-ignore - FlashList overrideItemLayout types may be outdated
          layout.size = ITEM_WIDTH;
          // @ts-ignore
          layout.offset = ITEM_WIDTH * index;
        }}
        // @ts-ignore - estimatedItemSize and estimatedListSize are valid FlashList props but types may be outdated
        estimatedItemSize={ITEM_WIDTH}
        estimatedListSize={{ width: SCREEN_WIDTH, height: WEEK_HEIGHT }}
        keyExtractor={(_, i) => `week-${i}`}
        renderItem={renderItem}
        removeClippedSubviews
        nestedScrollEnabled
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={onMomentumScrollEnd}
        extraData={{ selectedDate, localIndex }}
        initialScrollIndex={initialIndexRef.current}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    marginTop: 4,
    alignItems: 'center',
  },
  list: {
    height: WEEK_HEIGHT,
  },
  renderItemContainer: {
    width: ITEM_WIDTH,
    height: WEEK_HEIGHT,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  weekPage: {
    width: SCREEN_WIDTH,
    height: WEEK_HEIGHT,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 0,
  },
  weekContent: {
    width: WEEK_WIDTH,
    maxWidth: WEEK_WIDTH,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: 0,
  },
  dayContainer: {
    alignItems: 'center',
    flex: 1,
    minWidth: 0, // Allow flex items to shrink
    overflow: 'visible',
  },
  dayWrapper: {
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dayAcronym: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    marginBottom: 8,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    backgroundColor: 'transparent',
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
});
