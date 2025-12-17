import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View, ScrollView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { PlatformIcon } from '@/components/platform-icon';
import { IconButton } from '@/components/icon-button';

const SELECTED_DATE_KEY = '@select_date_modal_selected_date';

export type MonthData = {
  year: number;
  month: number; // 0-11 (0 = January)
  id: string;
};

type CalendarDay = {
  day: number | null; // null for empty cells
  date: Date | null; // null for empty cells
};

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// Generate months from 5 years ago to 1 year from now (ending in December)
const generateMonths = (): MonthData[] => {
  const months: MonthData[] = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const startYear = currentYear - 5;
  const endYear = currentYear + 1;

  for (let year = startYear; year <= endYear; year++) {
    const endMonth = year === endYear ? 11 : 11; // Always end in December
    for (let month = 0; month <= endMonth; month++) {
      months.push({
        year,
        month,
        id: `${year}-${month}`,
      });
    }
  }

  return months;
};

// Get the first day of week for a month (0 = Sunday, 1 = Monday, etc.)
// We need Monday = 0, so we adjust
const getFirstDayOfWeek = (year: number, month: number): number => {
  const date = new Date(year, month, 1);
  const day = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  // Convert to Monday = 0, Tuesday = 1, ..., Sunday = 6
  return day === 0 ? 6 : day - 1;
};

// Get days in a month
const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

// Generate calendar grid for a month
const generateCalendarGrid = (year: number, month: number): CalendarDay[] => {
  const days: CalendarDay[] = [];
  const firstDay = getFirstDayOfWeek(year, month);
  const daysInMonth = getDaysInMonth(year, month);

  // Add empty cells for days before the 1st (to align with Monday = column 0)
  for (let i = 0; i < firstDay; i++) {
    days.push({ day: null, date: null });
  }

  // Add days of the current month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push({
      day,
      date: new Date(year, month, day),
    });
  }

  // Add empty cells to complete the last row if needed
  const totalCells = days.length;
  const remainingCells = totalCells % 7;
  if (remainingCells > 0) {
    const cellsToAdd = 7 - remainingCells;
    for (let i = 0; i < cellsToAdd; i++) {
      days.push({ day: null, date: null });
    }
  }

  return days;
};

// Normalize date to start of day for comparison
const normalizeDate = (date: Date): Date => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

// Check if a date is today
const isToday = (date: Date | null): boolean => {
  if (!date) return false;
  const today = normalizeDate(new Date());
  const dateToCheck = normalizeDate(date);
  return (
    dateToCheck.getDate() === today.getDate() &&
    dateToCheck.getMonth() === today.getMonth() &&
    dateToCheck.getFullYear() === today.getFullYear()
  );
};

// Check if two dates are the same day
const isSameDay = (date1: Date | null, date2: Date | null): boolean => {
  if (!date1 || !date2) return false;
  const d1 = normalizeDate(date1);
  const d2 = normalizeDate(date2);
  return (
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear()
  );
};

type CalendarMonthItemProps = {
  monthData: MonthData;
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  themeColors: any;
};

const CalendarMonthItem = React.memo(({ monthData, selectedDate, onDateSelect, themeColors }: CalendarMonthItemProps) => {
  const { width } = useWindowDimensions();
  const grid = useMemo(() => generateCalendarGrid(monthData.year, monthData.month), [monthData.year, monthData.month]);
  
  // Calculate cell width: (container width - horizontal padding - gaps) / 7
  // Container padding: 20 * 2 = 40, gaps between 7 cells: 4 * 6 = 24
  const containerPadding = 40;
  const gapSize = 4; // Reduced spacing between cells
  const gapsBetweenCells = gapSize * 6; // 6 gaps of 4px each between 7 cells
  const availableWidth = width - containerPadding;
  const cellWidth = Math.floor((availableWidth - gapsBetweenCells) / 7);
  const gridWidth = cellWidth * 7 + gapsBetweenCells; // Total width for 7 cells + 6 gaps

  const isDateSelected = (date: Date | null): boolean => {
    if (!date) return false;
    // If no date is selected, default to today
    const dateToCompare = selectedDate || normalizeDate(new Date());
    return isSameDay(date, dateToCompare);
  };

  // Group cells into rows of 7
  const rows: CalendarDay[][] = [];
  for (let i = 0; i < grid.length; i += 7) {
    rows.push(grid.slice(i, i + 7));
  }

  return (
    <View style={styles.monthContainer}>
      <View style={styles.monthTitleContainer}>
        <Text style={[styles.monthTitle, { color: themeColors.text }]}>
          {MONTH_NAMES[monthData.month]} {monthData.year}
        </Text>
      </View>
      <View style={styles.calendarContainer}>
        <View style={[styles.calendarGrid, { width: gridWidth }]}>
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} style={[styles.calendarRow, { width: gridWidth }]}>
              {row.map((cell, cellIndex) => {
                const index = rowIndex * 7 + cellIndex;
                const isLastInRow = cellIndex === 6;
                
                if (cell.day === null) {
                  return (
                    <View 
                      key={index} 
                      style={[
                        styles.dayCell, 
                        { width: cellWidth, height: cellWidth },
                        isLastInRow && styles.dayCellLastInRow,
                      ]} 
                    />
                  );
                }

                const isSelected = isDateSelected(cell.date);
                const isTodayDate = isToday(cell.date);
                
                // Calculate smaller circle size (70% of cell width)
                const circleSize = Math.floor(cellWidth * 0.7);
                
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dayCell,
                      { width: cellWidth, height: cellWidth },
                      isLastInRow && styles.dayCellLastInRow,
                    ]}
                    activeOpacity={0.7}
                    onPress={() => {
                      if (cell.date) {
                        const normalizedDate = normalizeDate(cell.date);
                        onDateSelect(normalizedDate);
                      }
                    }}
                  >
                    <View
                      style={[
                        styles.circleIndicator,
                        { 
                          width: circleSize, 
                          height: circleSize,
                          borderRadius: circleSize / 2,
                        },
                        isSelected && { backgroundColor: themeColors.primary },
                        isTodayDate && !isSelected && {
                          borderWidth: 2,
                          borderColor: themeColors.primary,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          { color: isSelected ? themeColors.primaryForeground : themeColors.text },
                        ]}
                      >
                        {cell.day}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
});

CalendarMonthItem.displayName = 'CalendarMonthItem';

export default function SelectDateModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ selectedDate?: string }>();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const months = useMemo(() => generateMonths(), []);
  const listRef = useRef<FlashListRef<MonthData> | null>(null);

  // Parse selected date from params
  const selectedDate = useMemo(() => {
    if (params.selectedDate) {
      const date = new Date(params.selectedDate);
      if (!isNaN(date.getTime())) {
        return normalizeDate(date);
      }
    }
    return normalizeDate(new Date());
  }, [params.selectedDate]);

  // Find current month index for initial scroll position
  const currentMonthIndex = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    const index = months.findIndex(
      (month) => month.year === currentYear && month.month === currentMonth
    );
    return index >= 0 ? index : Math.floor(months.length / 2);
  }, [months]);

  useEffect(() => {
    if (listRef.current && currentMonthIndex >= 0) {
      // Scroll to current month after modal opens
      setTimeout(() => {
        listRef.current?.scrollToIndex({ 
          index: currentMonthIndex, 
          animated: true 
        });
      }, 300);
    }
  }, [currentMonthIndex]);

  const handleClose = () => {
    router.back();
  };

  const handleSelectToday = () => {
    const today = normalizeDate(new Date());
    handleDateSelect(today);
  };

  const handleDateSelect = async (date: Date) => {
    const normalizedDate = normalizeDate(date);
    // Store the selected date in AsyncStorage
    await AsyncStorage.setItem(SELECTED_DATE_KEY, normalizedDate.toISOString());
    // Navigate back
    router.back();
  };

  const renderMonth = ({ item }: { item: MonthData }) => (
    <CalendarMonthItem
      monthData={item}
      selectedDate={selectedDate}
      onDateSelect={handleDateSelect}
      themeColors={themeColors}
    />
  );

  const getItemType = () => 'month';

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background, borderTopWidth: 0, borderTopColor: 'transparent' }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? 20 + insets.top : 20, backgroundColor: themeColors.background, borderTopWidth: 0 }]}>
        <IconButton
          icon={{ sf: 'xmark', IconComponent: X }}
          onPress={handleClose}
          size="md"
        />
        <Text style={[styles.title, { color: themeColors.text }]} pointerEvents="none">{t('calendar.selectDate')}</Text>
        <TouchableOpacity
          style={[styles.todayButton, { backgroundColor: themeColors.iconButton }]}
          activeOpacity={0.7}
          onPress={handleSelectToday}
        >
          <Text style={[styles.todayButtonText, { color: themeColors.text }]}>{t('calendar.today')}</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <FlashList
          ref={listRef}
          data={months}
          renderItem={renderMonth}
          keyExtractor={(item) => item.id}
          getItemType={getItemType}
          showsVerticalScrollIndicator={false}
          initialScrollIndex={currentMonthIndex}
          // @ts-ignore - estimatedItemSize is valid FlashList prop
          estimatedItemSize={320}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderTopWidth: 0,
    borderTopColor: 'transparent',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    position: 'relative',
  },
  title: {
    ...typography.h6,
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    zIndex: 0,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  todayButton: {
    minWidth: 34,
    height: 34,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  todayButtonText: {
    ...typography.p3,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  monthContainer: {
    marginBottom: 32,
  },
  monthTitleContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  monthTitle: {
    ...typography.h6,
    textAlign: 'center',
  },
  calendarContainer: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  calendarGrid: {
    marginBottom: 8,
    alignSelf: 'center',
  },
  calendarRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  dayCell: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
    marginBottom: 4,
  },
  dayCellLastInRow: {
    marginRight: 0,
  },
  circleIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    ...typography.p3,
  },
});
