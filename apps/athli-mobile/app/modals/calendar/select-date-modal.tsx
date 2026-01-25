import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { StyleSheet, Text, useWindowDimensions, View, InteractionManager, Platform, Pressable } from 'react-native';
import { PressableOpacity } from 'pressto';
import { useRouter, useLocalSearchParams } from 'expo-router';
import PagerView, { type PagerViewOnPageSelectedEvent } from 'react-native-pager-view';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Check } from 'lucide-react-native';
import { Storage } from '@/lib/storage';
import { IconButton } from '@/components/ui/icon-button';

import { typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { useModalCallbacks } from '@/stores';
import { DropdownMenuWrapper, type DropdownMenuOption } from '@/components/ui/dropdown-menu';

const DEFAULT_STORAGE_KEY = '@select_date_modal_selected_date';

const WEEKDAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

type MonthData = {
  year: number;
  month: number;
  id: string;
};

const MONTH_NAMES_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const START_YEAR = 1900;
const END_YEAR = 2030;

// Window size for the pager - only keep this many months in memory
const PAGER_WINDOW_SIZE = 25; // ~2 years of months
const PAGER_CENTER_INDEX = Math.floor(PAGER_WINDOW_SIZE / 2);

// Helper to create a date key string for fast comparisons (avoids Date object creation)
const makeDateKey = (year: number, month: number, day: number): string => {
  return `${year}-${month}-${day}`;
};

// Get today's date data once
const getTodayData = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  return {
    key: makeDateKey(year, month, day),
    year,
    month,
    day,
    timestamp: new Date(year, month, day).getTime(),
  };
};

// Get month data from absolute month index (months since year 0)
const getMonthFromAbsoluteIndex = (absoluteIndex: number): MonthData => {
  const year = Math.floor(absoluteIndex / 12);
  const month = absoluteIndex % 12;
  return { year, month, id: `${year}-${month}` };
};

// Get absolute month index from year and month
const getAbsoluteMonthIndex = (year: number, month: number): number => {
  return year * 12 + month;
};

// Generate a window of months centered around a given absolute month index
const generateMonthWindow = (centerAbsoluteIndex: number, allowFuture: boolean): MonthData[] => {
  const now = new Date();
  const currentAbsoluteIndex = getAbsoluteMonthIndex(now.getFullYear(), now.getMonth());
  const minAbsoluteIndex = getAbsoluteMonthIndex(START_YEAR, 0);
  const maxAbsoluteIndex = allowFuture 
    ? getAbsoluteMonthIndex(END_YEAR, 11) 
    : currentAbsoluteIndex;

  const months: MonthData[] = [];
  const startIndex = Math.max(minAbsoluteIndex, centerAbsoluteIndex - PAGER_CENTER_INDEX);
  const endIndex = Math.min(maxAbsoluteIndex, startIndex + PAGER_WINDOW_SIZE - 1);

  for (let i = startIndex; i <= endIndex; i++) {
    months.push(getMonthFromAbsoluteIndex(i));
  }

  return months;
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

// Selected date state type
type SelectedDateState = {
  year: number;
  month: number;
  day: number;
  key: string;
};

type DayCellProps = {
  day: number;
  year: number;
  month: number;
  isSelected: boolean;
  isTodayDate: boolean;
  isFuture: boolean;
  isHighlighted: boolean;
  isLastInRow: boolean;
  cellWidth: number;
  circleSize: number;
  activeCircleSize: number;
  primaryColor: string;
  primaryForegroundColor: string;
  textColor: string;
  onDayPress: (year: number, month: number, day: number) => void;
};

// Simple day cell component - uses direct onPress to minimize overhead
const DayCell = ({
  day,
  year,
  month,
  isSelected,
  isTodayDate,
  isFuture,
  isHighlighted,
  isLastInRow,
  cellWidth,
  circleSize,
  activeCircleSize,
  primaryColor,
  primaryForegroundColor,
  textColor,
  onDayPress,
}: DayCellProps) => {
  const isActive = isSelected || isTodayDate;
  const currentCircleSize = isActive ? activeCircleSize : circleSize;
  const highlightRingSize = circleSize + 6;

  const isSelectedWithPhoto = isSelected && isHighlighted;
  const isSelectedWithoutPhoto = isSelected && !isHighlighted;
  const greenColor = '#22C55E';
  const showTodayBorder = isTodayDate && !isSelected && !isHighlighted;

  // Build styles outside JSX to reduce work during render
  const cellStyle = [
    styles.dayCell,
    { width: cellWidth, height: cellWidth },
    isLastInRow && styles.dayCellLastInRow,
  ];

  const circleStyle = [
    styles.circleIndicator,
    { width: currentCircleSize, height: currentCircleSize, borderRadius: currentCircleSize / 2 },
    isSelectedWithPhoto && { backgroundColor: greenColor },
    isSelectedWithoutPhoto && { backgroundColor: primaryColor },
    showTodayBorder && { borderWidth: 2, borderColor: primaryColor },
    isFuture && { opacity: 0.25 },
  ];

  const textStyle = [
    styles.dayText,
    { color: isSelectedWithPhoto ? '#FFFFFF' : isSelectedWithoutPhoto ? primaryForegroundColor : textColor },
  ];

  const cellContent = (
    <View style={styles.dayCellContent}>
      {isHighlighted && !isFuture && !isSelected && (
        <View
          style={[
            styles.highlightRing,
            { width: highlightRingSize, height: highlightRingSize, borderRadius: highlightRingSize / 2 },
          ]}
        />
      )}
      <View style={circleStyle}>
        <Text style={textStyle}>{day}</Text>
      </View>
    </View>
  );

  if (isFuture) {
    return <View style={cellStyle}>{cellContent}</View>;
  }

  return (
    <Pressable style={cellStyle} onPress={() => onDayPress(year, month, day)}>
      {cellContent}
    </Pressable>
  );
};

// Memoized version with custom equality check
const MemoizedDayCell = React.memo(DayCell, (prevProps, nextProps) => {
  // Only re-render if visual state changes
  return (
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isTodayDate === nextProps.isTodayDate &&
    prevProps.isFuture === nextProps.isFuture &&
    prevProps.isHighlighted === nextProps.isHighlighted &&
    prevProps.day === nextProps.day &&
    prevProps.cellWidth === nextProps.cellWidth
  );
});

type CalendarMonthPageProps = {
  monthData: MonthData;
  selectedDateKey: string;
  todayKey: string;
  todayTimestamp: number;
  onDayPress: (year: number, month: number, day: number) => void;
  primaryColor: string;
  primaryForegroundColor: string;
  textColor: string;
  cellWidth: number;
  gridWidth: number;
  allowFuture: boolean;
  highlightedDates?: Set<string>;
};

const CalendarMonthPage = React.memo(({
  monthData,
  selectedDateKey,
  todayKey,
  todayTimestamp,
  onDayPress,
  primaryColor,
  primaryForegroundColor,
  textColor,
  cellWidth,
  gridWidth,
  allowFuture,
  highlightedDates,
}: CalendarMonthPageProps) => {
  const firstDay = useMemo(() => getFirstDayOfWeek(monthData.year, monthData.month), [monthData.year, monthData.month]);
  const daysInMonth = useMemo(() => getDaysInMonth(monthData.year, monthData.month), [monthData.year, monthData.month]);

  const circleSize = Math.floor(cellWidth * 0.7);
  const activeCircleSize = Math.floor(cellWidth * 0.82);

  // Pre-compute all day data to avoid calculations in render loop
  const dayData = useMemo(() => {
    const data: Array<{
      day: number;
      dateKey: string;
      highlightKey: string;
      isFuture: boolean;
    }> = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = makeDateKey(monthData.year, monthData.month, day);
      // Format for highlighted dates: YYYY-MM-DD with zero-padded month and day
      const highlightKey = `${monthData.year}-${String(monthData.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      // Calculate if future using timestamp comparison (only once per day)
      let isFuture = false;
      if (!allowFuture) {
        const dayTimestamp = new Date(monthData.year, monthData.month, day).setHours(0, 0, 0, 0);
        isFuture = dayTimestamp > todayTimestamp;
      }

      data.push({ day, dateKey, highlightKey, isFuture });
    }

    return data;
  }, [monthData.year, monthData.month, daysInMonth, allowFuture, todayTimestamp]);

  const totalDays = firstDay + daysInMonth;
  const numRows = Math.ceil(totalDays / 7);

  const rows: React.ReactNode[] = [];
  let dayIndex = 0;

  for (let rowIndex = 0; rowIndex < Math.min(numRows, 5); rowIndex++) {
    const cells: React.ReactNode[] = [];

    for (let cellIndex = 0; cellIndex < 7; cellIndex++) {
      const position = rowIndex * 7 + cellIndex;
      const isLastInRow = cellIndex === 6;

      if (position < firstDay || dayIndex >= dayData.length) {
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
        const { day, dateKey, highlightKey, isFuture } = dayData[dayIndex];
        const isSelected = dateKey === selectedDateKey;
        const isTodayDate = dateKey === todayKey;
        const isHighlighted = highlightedDates?.has(highlightKey) ?? false;

        cells.push(
          <MemoizedDayCell
            key={cellIndex}
            day={day}
            year={monthData.year}
            month={monthData.month}
            isSelected={isSelected}
            isTodayDate={isTodayDate}
            isFuture={isFuture}
            isHighlighted={isHighlighted}
            isLastInRow={isLastInRow}
            cellWidth={cellWidth}
            circleSize={circleSize}
            activeCircleSize={activeCircleSize}
            primaryColor={primaryColor}
            primaryForegroundColor={primaryForegroundColor}
            textColor={textColor}
            onDayPress={onDayPress}
          />
        );
        dayIndex++;
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
}, (prevProps, nextProps) => {
  // Custom comparison for the month page - only re-render when necessary
  return (
    prevProps.monthData.id === nextProps.monthData.id &&
    prevProps.selectedDateKey === nextProps.selectedDateKey &&
    prevProps.todayKey === nextProps.todayKey &&
    prevProps.cellWidth === nextProps.cellWidth &&
    prevProps.gridWidth === nextProps.gridWidth &&
    prevProps.allowFuture === nextProps.allowFuture &&
    prevProps.highlightedDates === nextProps.highlightedDates &&
    prevProps.onDayPress === nextProps.onDayPress
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
  const params = useLocalSearchParams<{ selectedDate?: string; storageKey?: string; allowFuture?: string; highlightedDates?: string; mode?: string }>();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const { triggerDateSelect } = useModalCallbacks();
  const { width } = useWindowDimensions();
  const pagerRef = useRef<PagerView>(null);
  const isClosingRef = useRef(false);

  // Get storage key from params or use default
  const storageKey = params.storageKey || DEFAULT_STORAGE_KEY;
  const allowFuture = params.allowFuture !== 'false';
  const mode = params.mode || 'default'; // 'default' | 'birthdate'
  const showTodayButton = mode !== 'birthdate';

  // Compute today's data once per mount
  const todayData = useMemo(() => getTodayData(), []);

  // Parse highlighted dates (comma-separated date strings in YYYY-MM-DD format)
  const highlightedDates = useMemo(() => {
    if (!params.highlightedDates) return undefined;
    return new Set(params.highlightedDates.split(','));
  }, [params.highlightedDates]);

  // Parse initial selected date
  const initialSelectedState = useMemo((): SelectedDateState => {
    let date: Date;
    if (params.selectedDate) {
      const parsed = new Date(params.selectedDate);
      if (!isNaN(parsed.getTime())) {
        date = normalizeDate(parsed);
      } else {
        date = normalizeDate(new Date());
      }
    } else {
      date = normalizeDate(new Date());
    }
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    return {
      year,
      month,
      day,
      key: makeDateKey(year, month, day),
    };
  }, [params.selectedDate]);

  // Track the center month for the windowed pager
  const initialCenterAbsoluteIndex = useMemo(() => {
    return getAbsoluteMonthIndex(todayData.year, todayData.month);
  }, [todayData.year, todayData.month]);

  const [centerAbsoluteIndex, setCenterAbsoluteIndex] = useState(initialCenterAbsoluteIndex);
  
  // Generate windowed months - only ~25 months instead of 1500+
  const monthsData = useMemo(
    () => generateMonthWindow(centerAbsoluteIndex, allowFuture),
    [centerAbsoluteIndex, allowFuture]
  );

  // Find the initial page index within the window
  const initialPageIndex = useMemo(() => {
    const todayAbsoluteIndex = getAbsoluteMonthIndex(todayData.year, todayData.month);
    const firstMonthAbsoluteIndex = getAbsoluteMonthIndex(monthsData[0].year, monthsData[0].month);
    return Math.max(0, Math.min(monthsData.length - 1, todayAbsoluteIndex - firstMonthAbsoluteIndex));
  }, [monthsData, todayData.year, todayData.month]);

  const [isReady, setIsReady] = useState(false);
  const [currentPageIndex, setCurrentPageIndex] = useState(initialPageIndex);

  useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => {
      setIsReady(true);
    });
    return () => handle.cancel();
  }, []);

  // Dimensions - memoize to avoid recalculation
  const dimensions = useMemo(() => {
    const containerPadding = 40;
    const gapSize = 4;
    const gapsBetweenCells = gapSize * 6;
    const availableWidth = width - containerPadding;
    const cellWidth = Math.floor((availableWidth - gapsBetweenCells) / 7);
    const gridWidth = cellWidth * 7 + gapsBetweenCells;
    const pagerHeight = cellWidth * 5 + gapSize * 4;
    return { cellWidth, gridWidth, pagerHeight };
  }, [width]);

  const { cellWidth, gridWidth, pagerHeight } = dimensions;

  // Single state object for selected date - atomic updates, single re-render
  const [selectedState, setSelectedState] = useState<SelectedDateState>(initialSelectedState);

  // Extract primitive colors from theme to prevent object reference changes
  const primaryColor = themeColors.primary;
  const primaryForegroundColor = themeColors.primaryForeground;
  const textColor = themeColors.text;

  // Create Date object only when needed (for storage/callbacks)
  const selectedDate = useMemo(
    () => new Date(selectedState.year, selectedState.month, selectedState.day),
    [selectedState.year, selectedState.month, selectedState.day]
  );

  const currentMonthData = useMemo(() => {
    return monthsData[currentPageIndex] || { month: 0, year: new Date().getFullYear() };
  }, [currentPageIndex, monthsData]);

  // Generate month dropdown options
  const monthOptions = useMemo((): DropdownMenuOption[] => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const viewingYear = currentMonthData.year;

    return MONTH_NAMES_FULL.map((name, monthIndex) => {
      // Skip future months if not allowed
      if (!allowFuture && viewingYear === currentYear && monthIndex > now.getMonth()) {
        return null;
      }
      if (!allowFuture && viewingYear > currentYear) {
        return null;
      }

      return {
        label: name,
        onPress: () => {
          // Navigate to the target month by updating the center and page
          const targetAbsoluteIndex = getAbsoluteMonthIndex(viewingYear, monthIndex);
          const newMonths = generateMonthWindow(targetAbsoluteIndex, allowFuture);
          const targetPageIndex = newMonths.findIndex(
            (m) => m.year === viewingYear && m.month === monthIndex
          );
          
          if (targetPageIndex >= 0) {
            haptics.medium();
            setCenterAbsoluteIndex(targetAbsoluteIndex);
            setCurrentPageIndex(targetPageIndex);
            // Use setTimeout to ensure state is updated before setting page
            setTimeout(() => {
              pagerRef.current?.setPageWithoutAnimation(targetPageIndex);
            }, 0);
          }
        },
      };
    }).filter(Boolean) as DropdownMenuOption[];
  }, [currentMonthData, allowFuture]);

  // Generate year dropdown options
  const yearOptions = useMemo((): DropdownMenuOption[] => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const years: DropdownMenuOption[] = [];

    const endYear = allowFuture ? END_YEAR : currentYear;

    for (let year = START_YEAR; year <= endYear; year++) {
      years.push({
        label: String(year),
        onPress: () => {
          // Find the target month in the new year (same month if possible)
          let targetMonth = currentMonthData.month;

          // If switching to current year and current month is in the future, use current month
          if (!allowFuture && year === currentYear && targetMonth > now.getMonth()) {
            targetMonth = now.getMonth();
          }

          // Navigate to the target year/month
          const targetAbsoluteIndex = getAbsoluteMonthIndex(year, targetMonth);
          const newMonths = generateMonthWindow(targetAbsoluteIndex, allowFuture);
          const targetPageIndex = newMonths.findIndex(
            (m) => m.year === year && m.month === targetMonth
          );
          
          if (targetPageIndex >= 0) {
            haptics.medium();
            setCenterAbsoluteIndex(targetAbsoluteIndex);
            setCurrentPageIndex(targetPageIndex);
            setTimeout(() => {
              pagerRef.current?.setPageWithoutAnimation(targetPageIndex);
            }, 0);
          }
        },
      });
    }

    return years;
  }, [currentMonthData, allowFuture]);

  const handlePageSelected = useCallback((event: PagerViewOnPageSelectedEvent) => {
    const index = event.nativeEvent.position;
    if (index === currentPageIndex) return;
    setCurrentPageIndex(index);
    // Defer haptics to not block the UI update
    requestAnimationFrame(() => {
      haptics.medium();
    });
  }, [currentPageIndex]);

  // Stable callback for day press - uses single state update with deferred rendering
  const handleDayPress = useCallback((year: number, month: number, day: number) => {
    // Trigger haptics immediately for instant feedback
    haptics.medium();
    
    // Defer state update to allow touch animation to complete first
    InteractionManager.runAfterInteractions(() => {
      setSelectedState({
        year,
        month,
        day,
        key: makeDateKey(year, month, day),
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;

    haptics.success();
    Storage.setItem(storageKey, selectedDate.toISOString());
    triggerDateSelect(selectedDate);

    router.back();
  }, [router, storageKey, triggerDateSelect, selectedDate]);

  const handleSelectToday = useCallback(() => {
    const { year, month, day } = todayData;
    
    // Navigate to today's month
    const todayAbsoluteIndex = getAbsoluteMonthIndex(year, month);
    const newMonths = generateMonthWindow(todayAbsoluteIndex, allowFuture);
    const todayPageIndex = newMonths.findIndex(
      (m) => m.year === year && m.month === month
    );
    
    if (todayPageIndex >= 0) {
      setCenterAbsoluteIndex(todayAbsoluteIndex);
      setCurrentPageIndex(todayPageIndex);
      setTimeout(() => {
        pagerRef.current?.setPageWithoutAnimation(todayPageIndex);
      }, 0);
    }
    
    setSelectedState({
      year,
      month,
      day,
      key: makeDateKey(year, month, day),
    });
    // Defer haptics
    requestAnimationFrame(() => {
      haptics.medium();
    });
  }, [todayData, allowFuture]);

  // For birthdate mode on iOS, render native spinner picker
  if (mode === 'birthdate' && Platform.OS === 'ios') {
    const maxDate = allowFuture ? new Date(END_YEAR, 11, 31) : new Date();
    const minDate = new Date(START_YEAR, 0, 1);

    return (
      <View style={[styles.container, { backgroundColor: themeColors.backgroundSecondary }]}>
        <View style={styles.header}>
          <View style={styles.headerSideLeft} />
          <View style={styles.titleContainer}>
            <Text style={[styles.birthdateTitle, { color: themeColors.text }]}>
              {t('clients.editClientModal.dateOfBirth')}
            </Text>
          </View>
          <View style={styles.headerSideRight}>
            <IconButton
              icon={{ sf: 'checkmark', IconComponent: Check }}
              onPress={handleConfirm}
              size="md"
              variant="primary"
            />
          </View>
        </View>

        <View style={styles.datePickerContainer}>
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="spinner"
            onChange={(event, date) => {
              if (date) {
                const year = date.getFullYear();
                const month = date.getMonth();
                const day = date.getDate();
                setSelectedState({
                  year,
                  month,
                  day,
                  key: makeDateKey(year, month, day),
                });
              }
            }}
            maximumDate={maxDate}
            minimumDate={minDate}
            themeVariant="dark"
          />
        </View>
        <View style={styles.bottomSpacer} />
      </View>
    );
  }

  // Default calendar mode
  return (
    <View style={[styles.container, { backgroundColor: themeColors.backgroundSecondary, paddingBottom: 200 }]}>
      <View style={styles.header}>
        <View style={styles.headerSideLeft}>
          {showTodayButton && (
            <PressableOpacity
              style={[styles.todayButton, { backgroundColor: themeColors.surfacePrimary }]}
              onPress={handleSelectToday}
            >
              <Text style={[styles.todayButtonText, { color: themeColors.text }]}>{t('calendar.today')}</Text>
            </PressableOpacity>
          )}
        </View>
        <View style={styles.titleContainer}>
          <DropdownMenuWrapper options={monthOptions}>
            <View style={styles.dropdownButton}>
              <Text style={[styles.title, { color: themeColors.text }]}>
                {MONTH_NAMES_FULL[currentMonthData.month]}
              </Text>
              <View style={[styles.titleUnderline, { backgroundColor: themeColors.text }]} />
            </View>
          </DropdownMenuWrapper>
          <View style={styles.titleGap} />
          <DropdownMenuWrapper options={yearOptions}>
            <View style={styles.dropdownButton}>
              <Text style={[styles.title, { color: themeColors.text }]}>
                {currentMonthData.year}
              </Text>
              <View style={[styles.titleUnderline, { backgroundColor: themeColors.text }]} />
            </View>
          </DropdownMenuWrapper>
        </View>
        <View style={styles.headerSideRight}>
          <IconButton
            icon={{ sf: 'checkmark', IconComponent: Check }}
            onPress={handleConfirm}
            size="md"
            variant="primary"
          />
        </View>
      </View>

      {/* Weekday header row */}
      <View style={styles.weekdayContainer}>
        <WeekdayHeader cellWidth={cellWidth} gridWidth={gridWidth} themeColors={themeColors} />
      </View>

      <View style={[styles.pagerContainer, { width, height: pagerHeight }]}>
        {isReady ? (
          <PagerView
            key={centerAbsoluteIndex} // Force remount when window shifts
            ref={pagerRef}
            style={styles.pagerView}
            initialPage={currentPageIndex}
            onPageSelected={handlePageSelected}
            offscreenPageLimit={1}
          >
            {monthsData.map((monthData) => (
              <View key={monthData.id} style={styles.pageContainer} collapsable={false}>
                <CalendarMonthPage
                  monthData={monthData}
                  selectedDateKey={selectedState.key}
                  todayKey={todayData.key}
                  todayTimestamp={todayData.timestamp}
                  onDayPress={handleDayPress}
                  primaryColor={primaryColor}
                  primaryForegroundColor={primaryForegroundColor}
                  textColor={textColor}
                  cellWidth={cellWidth}
                  gridWidth={gridWidth}
                  allowFuture={allowFuture}
                  highlightedDates={highlightedDates}
                />
              </View>
            ))}
          </PagerView>
        ) : (
          <View style={styles.pageContainer}>
            <CalendarMonthPage
              monthData={monthsData[currentPageIndex] || monthsData[0]}
              selectedDateKey={selectedState.key}
              todayKey={todayData.key}
              todayTimestamp={todayData.timestamp}
              onDayPress={handleDayPress}
              primaryColor={primaryColor}
              primaryForegroundColor={primaryForegroundColor}
              textColor={textColor}
              cellWidth={cellWidth}
              gridWidth={gridWidth}
              allowFuture={allowFuture}
              highlightedDates={highlightedDates}
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
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownButton: {
    alignItems: 'center',
  },
  title: {
    ...typography.h6,
    textAlign: 'center',
  },
  birthdateTitle: {
    ...typography.h5,
    textAlign: 'center',
  },
  datePickerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  bottomSpacer: {
    height: 200,
  },
  titleUnderline: {
    height: 1.5,
    width: '100%',
    marginTop: 2,
    opacity: 0.5,
  },
  titleGap: {
    width: 8,
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
  dayCellContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#22C55E',
  },
  dayText: {
    ...typography.p1,
  },
});
