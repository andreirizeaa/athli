import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from 'react-native';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { X } from 'lucide-react-native';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { PlatformIcon } from '@/components/platform-icon';

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

  // Add empty cells for days before the 1st
  for (let i = 0; i < firstDay; i++) {
    days.push({ day: null, date: null });
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push({
      day,
      date: new Date(year, month, day),
    });
  }

  // Add empty cells at the end to complete the last row (always 7 columns)
  const totalCells = days.length;
  const remainingCells = totalCells % 7;
  if (remainingCells !== 0) {
    const cellsToAdd = 7 - remainingCells;
    for (let i = 0; i < cellsToAdd; i++) {
      days.push({ day: null, date: null });
    }
  }

  return days;
};

// Check if a date is today
const isToday = (date: Date | null): boolean => {
  if (!date) return false;
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
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
  
  // Calculate cell dimensions with proper spacing for 7 columns
  const containerPadding = 40;
  const availableWidth = width - containerPadding;
  const gapBetweenCells = 8; // Space between cells
  const sideGapWidth = (availableWidth - (6 * gapBetweenCells)) / 14; // Equal gap on each side
  const cellWidth = (availableWidth - (6 * gapBetweenCells) - (2 * sideGapWidth)) / 7;

  const isDateSelected = (date: Date | null): boolean => {
    if (!date || !selectedDate) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  return (
    <View style={styles.monthContainer}>
      <View style={styles.monthTitleContainer}>
        <Text style={[styles.monthTitle, { color: themeColors.text }]}>
          {MONTH_NAMES[monthData.month]} {monthData.year}
        </Text>
      </View>
      <View style={[styles.calendarGrid, { paddingLeft: sideGapWidth, paddingRight: sideGapWidth }]}>
        {grid.map((cell, index) => {
          const columnIndex = index % 7;
          const isLastInRow = columnIndex === 6;
          const isLastRow = index >= grid.length - 7;
          
          const cellStyle = [
            styles.dayCell,
            { 
              width: cellWidth, 
              height: cellWidth,
              marginRight: isLastInRow ? 0 : gapBetweenCells,
              marginBottom: isLastRow ? 0 : gapBetweenCells,
            },
          ];

          if (cell.day === null) {
            return <View key={index} style={cellStyle} />;
          }

          const isSelected = isDateSelected(cell.date);
          const isTodayDate = isToday(cell.date);
          const isTodayAndSelected = isSelected && isTodayDate;
          
          return (
            <TouchableOpacity
              key={index}
              style={[
                ...cellStyle,
                isSelected && { backgroundColor: themeColors.primary },
                isTodayDate && !isSelected && {
                  borderWidth: 2,
                  borderColor: themeColors.primary,
                },
              ]}
              activeOpacity={0.7}
              onPress={() => cell.date && onDateSelect(cell.date)}
            >
              <Text
                style={[
                  styles.dayText,
                  { color: isSelected ? '#FFFFFF' : themeColors.text },
                ]}
              >
                {cell.day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
});

CalendarMonthItem.displayName = 'CalendarMonthItem';

type SelectDateModalProps = {
  visible: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
};

export const SelectDateModal = ({ visible, onClose, selectedDate, onDateSelect }: SelectDateModalProps) => {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const { height: windowHeight } = useWindowDimensions();
  const months = useMemo(() => generateMonths(), []);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(windowHeight)).current;

  const surfaceColor = themeColors.surface;
  const mutedSurfaceColor = themeColors.surfaceSecondary;
  const dividerColor = themeColors.border;
  const iconColor = themeColors.text;
  const sheetHeight = (windowHeight * 90) / 100;

  // Find today's month index for initial scroll position
  const initialScrollIndex = useMemo(() => {
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    
    const index = months.findIndex(
      (month) => month.year === todayYear && month.month === todayMonth
    );
    return index >= 0 ? index : 0;
  }, [months]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: 0,
          duration: 260,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, backdropOpacity, sheetTranslateY]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: windowHeight,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        onClose();
      }
    });
  };

  const handleSelectToday = () => {
    onDateSelect(new Date());
    handleClose();
  };

  const handleDateSelect = (date: Date) => {
    onDateSelect(date);
    handleClose();
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
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableWithoutFeedback onPress={handleClose}>
          <Animated.View style={[styles.modalBackdrop, { opacity: backdropOpacity }]} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.modalSheet,
            {
              height: sheetHeight,
              backgroundColor: surfaceColor,
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}
        >
          <View style={styles.modalHandleContainer}>
            <View style={[styles.modalHandle, { backgroundColor: dividerColor }]} />
          </View>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>{t('calendar.selectDate')}</Text>
            <View style={styles.modalHeaderRight}>
              <TouchableOpacity
                style={[styles.todayButton, { backgroundColor: mutedSurfaceColor }]}
                activeOpacity={0.7}
                onPress={handleSelectToday}
              >
                <Text style={[styles.todayButtonText, { color: themeColors.text }]}>{t('calendar.today')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalCloseButton, { backgroundColor: mutedSurfaceColor }]}
                activeOpacity={0.7}
                onPress={handleClose}
              >
                <PlatformIcon sf="xmark" IconComponent={X} size={iconSizes.modalIcons} color={iconColor} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.calendarListContainer}>
            {/* @ts-ignore - estimatedItemSize and drawDistance are valid FlashList props but types may be outdated */}
            <FlashList<MonthData>
              data={months}
              renderItem={renderMonth}
              keyExtractor={(item) => item.id}
              getItemType={getItemType}
              showsVerticalScrollIndicator={false}
              initialScrollIndex={initialScrollIndex}
              // @ts-ignore
              estimatedItemSize={300}
              // @ts-ignore
              drawDistance={1000}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  modalHandleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    ...typography.h6,
  },
  modalHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  todayButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  todayButtonText: {
    ...typography.p3,
    fontWeight: '600',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarListContainer: {
    flex: 1,
  },
  monthContainer: {
    marginBottom: 32,
  },
  monthTitleContainer: {
    alignItems: 'center',
    marginBottom: 4,
  },
  monthTitle: {
    ...typography.h6,
    textAlign: 'center',
    marginBottom: 6,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999, // Make it circular
  },
  dayText: {
    ...typography.p3,
  },
});
