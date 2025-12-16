import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { FlashList, type FlashListRef } from '@shopify/flash-list';

import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { typography } from '@/constants/typography';
import { generateWeeks, getWeekIndexForDate, getWeekMonthYear } from '@/lib/utils/calendar-utils';

const { width: RAW_W } = Dimensions.get('window');
const SCREEN_WIDTH = Math.round(RAW_W);
const ITEM_WIDTH = SCREEN_WIDTH; // page width
const WEEK_HEIGHT = 80;

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
    primaryColor,
  }: {
    days: DayData[];
    onPressDay: (d: DayData) => void;
    shouldRender: boolean;
    themeColors: any;
    primaryColor: string;
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
                ]}
              >
                {/* Day acronym above the circle */}
                <Text
                  style={[
                    styles.dayAcronym,
                    { color: day.isActive ? themeColors.text : themeColors.mutedText },
                    day.isActive && { fontWeight: '700' },
                  ]}
                >
                  {day.dayName}
                </Text>

                <View
                  style={[
                    styles.dayCircle,
                    day.isActive && { backgroundColor: primaryColor },
                  ]}
                >
                  {/* Day number inside the circle */}
                  <Text
                    style={[
                      styles.dayNumber,
                      day.isActive
                        ? { color: themeColors.primaryForeground }
                        : day.isToday
                          ? { color: primaryColor }
                          : { color: themeColors.mutedText },
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
  const { primaryColor, colors: themeColors } = useThemePreference();
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
  ].map((d) => d?.trim()?.[0] ?? '');

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
          primaryColor={primaryColor}
        />
      </View>
    ),
    [shouldRenderIndex, themeColors, primaryColor]
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
    width: '100%',
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
    width: '100%',
    height: WEEK_HEIGHT,
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    paddingTop: 0,
    paddingHorizontal: 0,
    marginHorizontal: 0,
  },
  weekContent: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 0,
    marginHorizontal: 0,
  },
  dayContainer: {
    alignItems: 'center',
    flex: 1,
    minWidth: 0, // Allow flex items to shrink
    overflow: 'visible',
    paddingHorizontal: 0,
    marginHorizontal: 0,
  },
  dayWrapper: {
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 2,
  },
  dayAcronym: {
    ...typography.h8,
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
    ...typography.h6,
  },
});
