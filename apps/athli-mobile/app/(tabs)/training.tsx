import React, { useState, useMemo, useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChevronDown, User } from 'lucide-react-native';

import { typography, iconSizes, headingFontFamily } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { useTrainingOverlay } from '@/contexts/useTrainingOverlay';
import { PlatformIcon } from '@/components/platform-icon';
import { SwipeableCalendar } from '@/components/calendar/swipeable-calendar';
import { formatDateDDMMYYYY } from '@/lib/utils/date-formatters';
import { TrainingAddOptions } from '@/components/training/training-add-options';

const SELECTED_DATE_KEY = '@select_date_modal_selected_date';

export default function TrainingScreen() {
  const router = useRouter();
  const { primaryColor, colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const { isVisible: isOverlayVisible, hideOverlay } = useTrainingOverlay();
  const insets = useSafeAreaInsets();
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [hasSelectedDate, setHasSelectedDate] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [calendarKey, setCalendarKey] = useState(0); // Key to force calendar reset

  const [displayedDate, setDisplayedDate] = useState<Date | null>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [incomingDate, setIncomingDate] = useState<Date | null>(null);

  const animateCalendarForDateChange = useCallback(
    (nextDate: Date) => {
      const prevDate = displayedDate;
      if (!prevDate) {
        setDisplayedDate(nextDate);
        setIncomingDate(null);
        return;
      }

      const prevTime = prevDate.getTime();
      const nextTime = nextDate.getTime();
      if (prevTime === nextTime) {
        // Still commit + reset, so the UI updates
        const committed = new Date(nextDate);
        committed.setHours(0, 0, 0, 0);
        
        setDisplayedDate(committed);
        setIncomingDate(null);
        return;
      }

      // Simply update the displayed date without animation
      setDisplayedDate(nextDate);
      setIncomingDate(null);
    },
    [displayedDate]
  );

  const handleOpenDatePicker = () => {
    const dateParam = selectedDate ? selectedDate.toISOString() : new Date().toISOString();
    router.push({
      pathname: '/select-date-modal',
      params: { selectedDate: dateParam },
    });
  };

  // Listen for when we return from the modal and check if date was updated
  useFocusEffect(
    useCallback(() => {
      const checkSelectedDate = async () => {
        try {
          const storedDate = await AsyncStorage.getItem(SELECTED_DATE_KEY);
          if (storedDate) {
            const date = new Date(storedDate);
            if (!isNaN(date.getTime())) {
              date.setHours(0, 0, 0, 0);
              animateCalendarForDateChange(date);
              setSelectedDate(date);
              setHasSelectedDate(true);
              setCurrentMonth(date.getMonth());
              setCurrentYear(date.getFullYear());
              // Clear the stored date after reading it
              await AsyncStorage.removeItem(SELECTED_DATE_KEY);
            }
          }
        } catch (error) {
          console.error('Failed to read selected date:', error);
        }
      };
      checkSelectedDate();
    }, [animateCalendarForDateChange])
  );

  const handleDateSelect = (date: Date) => {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    
    animateCalendarForDateChange(newDate);
    setSelectedDate(newDate);
    setHasSelectedDate(true);
    // Update month and year to reflect the selected date
    setCurrentMonth(newDate.getMonth());
    setCurrentYear(newDate.getFullYear());
    // Save date in dd-mm-yyyy format (you can add AsyncStorage here if needed)
    const formattedDate = formatDateDDMMYYYY(newDate);
    console.log('Selected date:', formattedDate);
    // TODO: Save to storage if needed
  };

  const handleCalendarSwipe = (month: number, year: number) => {
    setCurrentMonth(month);
    setCurrentYear(year);
  };

  const handleProfilePress = () => {
    router.push('/profile');
  };

  const displayText = useMemo(() => {
    const monthKeys = [
      'january',
      'february',
      'march',
      'april',
      'may',
      'june',
      'july',
      'august',
      'september',
      'october',
      'november',
      'december',
    ] as const;

    // If a date is selected, show the exact selected date
    if (selectedDate) {
      const monthName = t(`calendar.months.${monthKeys[selectedDate.getMonth()]}`);
      const day = selectedDate.getDate();
      const yearShort = selectedDate.getFullYear().toString().slice(-2);
      return `${monthName} ${yearShort}`;
    }

    // Fallback: show the currently visible month/year from the swipeable calendar
    const monthName = t(`calendar.months.${monthKeys[currentMonth]}`);
    const yearShort = currentYear.toString().slice(-2);
    return `${monthName} ${yearShort}`;
  }, [selectedDate, currentMonth, currentYear, t]);

  const getDateLabel = useCallback((d: Date | null) => {
    if (!d) return '';
    const weekday = d.toLocaleDateString(undefined, { weekday: 'long' });
    const day = d.getDate().toString().padStart(2, '0');
    const month = d.toLocaleDateString(undefined, { month: 'short' });
    const year = d.getFullYear();
    return `${weekday} - ${day} ${month} ${year}`;
  }, []);

  const displayedDateLabel = useMemo(() => getDateLabel(displayedDate), [displayedDate, getDateLabel]);
  const incomingDateLabel = useMemo(() => getDateLabel(incomingDate), [incomingDate, getDateLabel]);

  // Button colors: always white background with black icon
  const buttonBackgroundColor = themeColors.searchBarBackground;
  const buttonIconColor = themeColors.text;

  // Mock user avatar - in the future, this will come from user service/context
  const userAvatar = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces';

  const handleAddFromLibrary = () => {
    hideOverlay();
    router.push('/add-session-from-library-modal');
  };

  const handleCreateSession = () => {
    hideOverlay();
    // TODO: Implement create session functionality
  };

  const handleOneOffSession = () => {
    hideOverlay();
    // TODO: Implement one-off session functionality
  };

  return (
    <View style={[styles.screen, { backgroundColor: themeColors.pageBackground }]}>
      <View
        style={[
          styles.safeArea,
          {
            paddingTop: insets.top,
            paddingBottom: 0,
            paddingLeft: insets.left,
            paddingRight: insets.right,
          },
        ]}
      >
        <View style={styles.container}>
          {/* Top row: Title on left, Date picker and Today button on right */}
          <View style={styles.headerTopRow}>
            <Text style={[styles.title, { color: themeColors.text }]}>{t('training.title')}</Text>
            <View style={styles.headerRightButtons}>
              <TouchableOpacity
                style={styles.dateButton}
                activeOpacity={0.7}
                onPress={handleOpenDatePicker}
              >
                <Text style={[styles.dateButtonText, { color: themeColors.text }]}>{displayText}</Text>
                <PlatformIcon
                  sf="chevron.down"
                  IconComponent={ChevronDown}
                  size={iconSizes.navigationChevrons}
                  color={themeColors.text}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.profileButton}
                activeOpacity={0.7}
                onPress={handleProfilePress}
              >
                {userAvatar ? (
                  <Image source={{ uri: userAvatar }} style={styles.profileAvatarImage} />
                ) : (
                  <View style={[styles.profileAvatar, { backgroundColor: buttonBackgroundColor }]}>
                    <PlatformIcon
                      sf="person.fill"
                      IconComponent={User}
                      size={iconSizes.navigationChevrons}
                      color={buttonIconColor}
                    />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
          {/* Bottom row: Swipeable Calendar */}
          <View style={styles.headerBottomRow}>
            <SwipeableCalendar
              key={calendarKey}
              initialSelectedDate={selectedDate || undefined}
              onDateSelect={handleDateSelect}
              onSwipe={handleCalendarSwipe}
            />
          </View>

          <View style={styles.staticHeader}>
            <View style={[styles.divider, { backgroundColor: themeColors.mutedText, opacity: 0.3 }]} />
          </View>
        </View>
      </View>

      <TrainingAddOptions
        isVisible={isOverlayVisible}
        onAddFromLibraryPress={handleAddFromLibrary}
        onCreateSessionPress={handleCreateSession}
        onOneOffSessionPress={handleOneOffSession}
        onClose={hideOverlay}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingTop: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 0,
    width: '100%',
  },
  headerRightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerBottomRow: {
    width: '100%',
    alignSelf: 'stretch',
  },
  staticHeader: {
    width: '100%',
  },
  divider: {
    width: '100%',
    height: 1,
    alignSelf: 'stretch',
    marginTop: 4,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateButtonText: {
    ...typography.h4,
    textAlign: 'left',
  },
  title: {
    ...typography.h1,
    textAlign: 'left',
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
});

