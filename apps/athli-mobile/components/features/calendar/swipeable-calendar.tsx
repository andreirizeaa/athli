import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { PressableOpacity } from 'pressto';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import SquircleView from 'react-native-fast-squircle';

import { useThemePreference, useColorScheme } from '@/stores';
import { useTranslations } from '@/stores';
import { typography } from '@/constants/typography';
import { generateWeeks, getWeekIndexForDate, getWeekMonthYear, generateWeeksInRange } from '@/lib/utils/calendar-utils';

const { width: RAW_W } = Dimensions.get('window');
const SCREEN_WIDTH = Math.round(RAW_W);
const ITEM_WIDTH = SCREEN_WIDTH; // page width
const WEEK_HEIGHT = 90;

interface SwipeableCalendarProps {
  onDateSelect?: (date: Date) => void;
  onSwipe?: (month: number, year: number) => void;
  initialSelectedDate?: Date;
  minDate?: Date; // Minimum scrollable date
  maxDate?: Date; // Maximum scrollable date
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
    isLightMode,
  }: {
    days: DayData[];
    onPressDay: (d: DayData) => void;
    shouldRender: boolean;
    themeColors: any;
    isLightMode: boolean;
  }) {
    // In light mode use white with border, in dark mode use surfacePrimary
    const pillBackgroundColor = isLightMode ? '#FFFFFF' : themeColors.surfacePrimary;

    // Card-like styling for active/today pills
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
      <View style={styles.weekPage} renderToHardwareTextureAndroid shouldRasterizeIOS>
        <View style={styles.weekContent}>
          {days.map((day, i) => (
            <PressableOpacity
              key={`${day.date.toISOString()}-${i}`}
              style={styles.dayContainer}
              onPress={() => onPressDay(day)}
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
                      opacity: day.isActive ? 1 : (day.isFuture ? 0.3 : 0.7),
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
                      opacity: day.isActive ? 1 : (day.isFuture ? 0.3 : 0.5),
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayNumber,
                      day.isActive
                        ? { color: themeColors.text, fontWeight: '600' }
                        : { color: day.isFuture ? themeColors.mutedText : themeColors.text },
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
  },
  (a, b) =>
    a.shouldRender === b.shouldRender &&
    a.isLightMode === b.isLightMode &&
    a.days.length === b.days.length &&
    a.days.every(
      (day, i) =>
        day.date.toISOString() === b.days[i]?.date.toISOString() &&
        day.isActive === b.days[i]?.isActive &&
        day.isFuture === b.days[i]?.isFuture &&
        day.isToday === b.days[i]?.isToday
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
  minDate,
  maxDate,
}: SwipeableCalendarProps) => {
  const { colors: themeColors } = useThemePreference();
  const colorScheme = useColorScheme();
  const isLightMode = colorScheme === 'light';
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

  // Generate weeks - limited range if minDate/maxDate provided, otherwise full range
  const weeks = useMemo(() => {
    if (minDate && maxDate) {
      return generateWeeksInRange(minDate, maxDate);
    }
    return generateWeeks();
  }, [minDate, maxDate]);

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
        // Trigger scroll to the new date
        const idx = Math.max(0, Math.min(weeks.length - 1, getWeekIndexForDate(normalized, weeks)));
        setCurrentWeekIndex(idx);
        setLocalIndex(idx);
        if (listRef.current && hasMounted.current) {
          setTimeout(() => {
            listRef.current?.scrollToIndex({ index: idx, animated: true });
          }, 100);
        }
      }
    }
  }, [initialSelectedDate, selectedDate, weeks]);

  const dayAcronyms = [
    t('calendar.days.monday'),
    t('calendar.days.tuesday'),
    t('calendar.days.wednesday'),
    t('calendar.days.thursday'),
    t('calendar.days.friday'),
    t('calendar.days.saturday'),
    t('calendar.days.sunday'),
  ].map((d) => d?.trim()?.slice(0, 3) ?? '');

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

  // Always render all weeks to ensure all dates are clickable
  // The FlashList will handle virtualization efficiently
  const shouldRenderIndex = useCallback(
    () => true, // Always render - FlashList handles optimization
    []
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
    ({ item }: { item: DayData[] }) => (
      <View style={styles.renderItemContainer}>
        <WeekPage
          days={item}
          onPressDay={handleDatePress}
          shouldRender={shouldRenderIndex()}
          themeColors={themeColors}
          isLightMode={isLightMode}
        />
      </View>
    ),
    [shouldRenderIndex, themeColors, isLightMode]
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
