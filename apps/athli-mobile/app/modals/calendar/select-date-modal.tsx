import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { StyleSheet, Text, useWindowDimensions, View, InteractionManager } from 'react-native';
import { PressableOpacity } from 'pressto';
import { useRouter, useLocalSearchParams } from 'expo-router';
import PagerView, { type PagerViewOnPageSelectedEvent } from 'react-native-pager-view';
import { Storage } from '@/lib/storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { useModalCallbacks } from '@/contexts/modal-callbacks';

const DEFAULT_STORAGE_KEY = '@select_date_modal_selected_date';

const WEEKDAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

type MonthData = {
  year: number;
  month: number;
  id: string;
};

const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Only generate 2 years of months (1 year back, current, 1 year forward) = 36 months
const generateMonths = (allowFuture: boolean): MonthData[] => {
  const months: MonthData[] = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const startYear = currentYear - 1;
  const endYear = allowFuture ? currentYear + 1 : currentYear;

  for (let year = startYear; year <= endYear; year++) {
    for (let month = 0; month <= 11; month++) {
      if (!allowFuture && year === currentYear && month > currentMonth) {
        break;
      }
      months.push({ year, month, id: `${year}-${month}` });
    }
  }
  return months;
};

const getInitialMonthIndex = (months: MonthData[]): number => {
  const now = new Date();
  const index = months.findIndex(
    (m) => m.year === now.getFullYear() && m.month === now.getMonth()
  );
  return index >= 0 ? index : months.length - 1;
};

const getFirstDayOfWeek = (year: number, month: number): number => {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
};

const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

const normalizeDate = (date: Date): Date => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

const isToday = (date: Date | null): boolean => {
  if (!date) return false;
  const today = normalizeDate(new Date());
  const d = normalizeDate(date);
  return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
};

const isSameDay = (date1: Date | null, date2: Date | null): boolean => {
  if (!date1 || !date2) return false;
  const d1 = normalizeDate(date1);
  const d2 = normalizeDate(date2);
  return d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
};

type CalendarMonthPageProps = {
  monthData: MonthData;
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  themeColors: any;
  cellWidth: number;
  gridWidth: number;
  allowFuture: boolean;
};

const CalendarMonthPage = React.memo(({
  monthData,
  selectedDate,
  onDateSelect,
  themeColors,
  cellWidth,
  gridWidth,
  allowFuture,
}: CalendarMonthPageProps) => {
  const firstDay = getFirstDayOfWeek(monthData.year, monthData.month);
  const daysInMonth = getDaysInMonth(monthData.year, monthData.month);

  const circleSize = Math.floor(cellWidth * 0.7);
  const activeCircleSize = Math.floor(cellWidth * 0.82);
  const rows: React.ReactNode[] = [];

  let dayCounter = 1;
  const totalDays = firstDay + daysInMonth;
  const numRows = Math.ceil(totalDays / 7);

  for (let rowIndex = 0; rowIndex < Math.min(numRows, 5); rowIndex++) {
    const cells: React.ReactNode[] = [];

    for (let cellIndex = 0; cellIndex < 7; cellIndex++) {
      const position = rowIndex * 7 + cellIndex;
      const isLastInRow = cellIndex === 6;

      if (position < firstDay || dayCounter > daysInMonth) {
        cells.push(
          <View
            key={cellIndex}
            style={[
              styles.dayCell,
              { width: cellWidth, height: cellWidth },
              isLastInRow && styles.dayCellLastInRow,
            ]}
          />
        );
      } else {
        const day = dayCounter;
        const date = new Date(monthData.year, monthData.month, day);
        const isSelected = selectedDate ? isSameDay(date, selectedDate) : isToday(date);
        const isTodayDate = isToday(date);

        const isFuture = !allowFuture && normalizeDate(date).getTime() > normalizeDate(new Date()).getTime();

        const isActive = isSelected || isTodayDate;
        const currentCircleSize = isActive ? activeCircleSize : circleSize;

        const cellContent = (
          <View
            style={[
              styles.circleIndicator,
              { width: currentCircleSize, height: currentCircleSize, borderRadius: currentCircleSize / 2 },
              isSelected && { backgroundColor: themeColors.primary },
              isTodayDate && !isSelected && { borderWidth: 2, borderColor: themeColors.primary },
              isFuture && { opacity: 0.25 },
            ]}
          >
            <Text
              style={[
                styles.dayText,
                { color: isSelected ? themeColors.primaryForeground : themeColors.text },
              ]}
            >
              {day}
            </Text>
          </View>
        );

        if (isFuture) {
          cells.push(
            <View
              key={cellIndex}
              style={[
                styles.dayCell,
                { width: cellWidth, height: cellWidth },
                isLastInRow && styles.dayCellLastInRow,
              ]}
            >
              {cellContent}
            </View>
          );
        } else {
          cells.push(
            <PressableOpacity
              key={cellIndex}
              style={[
                styles.dayCell,
                { width: cellWidth, height: cellWidth },
                isLastInRow && styles.dayCellLastInRow,
              ]}
              onPress={() => onDateSelect(normalizeDate(date))}
            >
              {cellContent}
            </PressableOpacity>
          );
        }
        dayCounter++;
      }
    }

    rows.push(
      <View key={rowIndex} style={[styles.calendarRow, { width: gridWidth }]}>
        {cells}
      </View>
    );
  }

  return (
    <View style={styles.monthPageContainer}>
      <View style={[styles.calendarGrid, { width: gridWidth }]}>
        {rows}
      </View>
    </View>
  );
});

CalendarMonthPage.displayName = 'CalendarMonthPage';

type WeekdayHeaderProps = {
  cellWidth: number;
  gridWidth: number;
  themeColors: any;
};

const WeekdayHeader = React.memo(({ cellWidth, gridWidth, themeColors }: WeekdayHeaderProps) => {
  return (
    <View style={[styles.weekdayRow, { width: gridWidth }]}>
      {WEEKDAY_LETTERS.map((letter, index) => (
        <View
          key={index}
          style={[
            styles.weekdayCell,
            { width: cellWidth },
            index === 6 && styles.weekdayCellLast,
          ]}
        >
          <Text style={[styles.weekdayText, { color: themeColors.mutedText }]}>
            {letter}
          </Text>
        </View>
      ))}
    </View>
  );
});

WeekdayHeader.displayName = 'WeekdayHeader';

export default function SelectDateModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ selectedDate?: string; storageKey?: string; allowFuture?: string }>();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const { triggerDateSelect } = useModalCallbacks();
  const { width } = useWindowDimensions();
  const pagerRef = useRef<PagerView>(null);
  const isClosingRef = useRef(false);

  // Get storage key from params or use default
  const storageKey = params.storageKey || DEFAULT_STORAGE_KEY;
  const allowFuture = params.allowFuture !== 'false';

  const monthsData = useMemo(() => generateMonths(allowFuture), [allowFuture]);
  const initialMonthIndex = useMemo(() => getInitialMonthIndex(monthsData), [monthsData]);

  const [isReady, setIsReady] = useState(false);
  const [currentPageIndex, setCurrentPageIndex] = useState(initialMonthIndex);

  useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => {
      setIsReady(true);
    });
    return () => handle.cancel();
  }, []);

  // Dimensions
  const containerPadding = 40;
  const gapSize = 4;
  const gapsBetweenCells = gapSize * 6;
  const availableWidth = width - containerPadding;
  const cellWidth = Math.floor((availableWidth - gapsBetweenCells) / 7);
  const gridWidth = cellWidth * 7 + gapsBetweenCells;
  // Calculate pager height: 5 rows of cells + gaps between rows
  const pagerHeight = cellWidth * 5 + gapSize * 4;

  // Parse initial selected date
  const initialSelectedDate = useMemo(() => {
    if (params.selectedDate) {
      const date = new Date(params.selectedDate);
      if (!isNaN(date.getTime())) {
        return normalizeDate(date);
      }
    }
    return normalizeDate(new Date());
  }, [params.selectedDate]);

  const [selectedDate, setSelectedDate] = useState<Date>(initialSelectedDate);

  const currentMonthTitle = useMemo(() => {
    const monthData = monthsData[currentPageIndex];
    if (monthData) {
      return `${MONTH_NAMES_SHORT[monthData.month]} ${monthData.year}`;
    }
    return '';
  }, [currentPageIndex, monthsData]);

  const handlePageSelected = useCallback((event: PagerViewOnPageSelectedEvent) => {
    const index = event.nativeEvent.position;
    if (index === currentPageIndex) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentPageIndex(index);
  }, [currentPageIndex]);

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  const handleDateSelect = useCallback((date: Date) => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;

    setSelectedDate(date);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Storage.setItem(storageKey, date.toISOString());
    triggerDateSelect(date);

    setTimeout(() => {
      router.back();
    }, 120);
  }, [router, storageKey, triggerDateSelect]);

  const handleSelectToday = useCallback(() => {
    const today = normalizeDate(new Date());
    const todayMonthIndex = monthsData.findIndex(
      (m) => m.year === today.getFullYear() && m.month === today.getMonth()
    );
    if (todayMonthIndex >= 0 && todayMonthIndex !== currentPageIndex) {
      pagerRef.current?.setPage(todayMonthIndex);
    }
    handleDateSelect(today);
  }, [currentPageIndex, monthsData, handleDateSelect]);

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background, paddingBottom: 200 }]}>
      <View style={styles.header}>
        <View style={styles.headerSideLeft} />
        <Text style={[styles.title, { color: themeColors.text }]} pointerEvents="none">
          {currentMonthTitle}
        </Text>
        <View style={styles.headerSideRight}>
          <PressableOpacity
            style={[styles.todayButton, { backgroundColor: themeColors.iconButton }]}
            onPress={handleSelectToday}
          >
            <Text style={[styles.todayButtonText, { color: themeColors.text }]}>{t('calendar.today')}</Text>
          </PressableOpacity>
        </View>
      </View>

      {/* Weekday header row */}
      <View style={styles.weekdayContainer}>
        <WeekdayHeader cellWidth={cellWidth} gridWidth={gridWidth} themeColors={themeColors} />
      </View>

      <View style={[styles.pagerContainer, { width, height: pagerHeight }]}>
        {isReady ? (
          <PagerView
            ref={pagerRef}
            style={styles.pagerView}
            initialPage={initialMonthIndex}
            onPageSelected={handlePageSelected}
            offscreenPageLimit={1}
          >
            {monthsData.map((monthData, index) => {
              const shouldRender = Math.abs(index - currentPageIndex) <= 2;

              return (
                <View key={monthData.id} style={styles.pageContainer} collapsable={false}>
                  {shouldRender ? (
                    <CalendarMonthPage
                      monthData={monthData}
                      selectedDate={selectedDate}
                      onDateSelect={handleDateSelect}
                      themeColors={themeColors}
                      cellWidth={cellWidth}
                      gridWidth={gridWidth}
                      allowFuture={allowFuture}
                    />
                  ) : null}
                </View>
              );
            })}
          </PagerView>
        ) : (
          <View style={styles.pageContainer}>
            <CalendarMonthPage
              monthData={monthsData[initialMonthIndex]}
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
              themeColors={themeColors}
              cellWidth={cellWidth}
              gridWidth={gridWidth}
              allowFuture={allowFuture}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerSideLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  headerSideRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  title: {
    ...typography.h6,
    textAlign: 'center',
  },
  todayButton: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayButtonText: {
    ...typography.p3,
    fontWeight: '600',
  },
  weekdayContainer: {
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 4,
  },
  weekdayRow: {
    flexDirection: 'row',
    alignSelf: 'center',
    paddingVertical: 12,
  },
  weekdayCell: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  weekdayCellLast: {
    marginRight: 0,
  },
  weekdayText: {
    ...typography.p3,
    fontWeight: '600',
  },
  pagerContainer: {
    paddingHorizontal: 16,
  },
  pagerView: {
    flex: 1,
  },
  pageContainer: {
    flex: 1,
    alignItems: 'center',
  },
  monthPageContainer: {
    flex: 1,
    alignItems: 'center',
  },
  calendarGrid: {
    alignSelf: 'center',
  },
  calendarRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dayCell: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  dayCellLastInRow: {
    marginRight: 0,
  },
  circleIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    ...typography.p1,
  },
});
