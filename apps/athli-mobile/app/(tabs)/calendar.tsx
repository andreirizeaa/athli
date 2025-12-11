import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronDown } from 'lucide-react-native';

import { typography, iconSizes } from '@/constants/typography';
import { useColorScheme, useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { PlatformIcon } from '@/components/platform-icon';
import { SelectDateModal } from '@/components/calendar/select-date-modal';
import { formatDateDDMMYYYY, formatDateShort, formatDateMonthYearShort } from '@/lib/utils/date-formatters';

export default function CalendarScreen() {
  const colorScheme = useColorScheme();
  const { primarySoftColor, colors: themeColors } = useThemePreference();
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [hasSelectedDate, setHasSelectedDate] = useState(false);

  const gradientColors: [string, string] =
    colorScheme === 'dark'
      ? ['#2a2a2a', themeColors.pageBackground]
      : [primarySoftColor, themeColors.pageBackground];

  const handleOpenDatePicker = () => {
    setIsDatePickerVisible(true);
  };

  const handleCloseDatePicker = () => {
    setIsDatePickerVisible(false);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setHasSelectedDate(true);
    // Save date in dd-mm-yyyy format (you can add AsyncStorage here if needed)
    const formattedDate = formatDateDDMMYYYY(date);
    console.log('Selected date:', formattedDate);
    // TODO: Save to storage if needed
  };

  const displayText = hasSelectedDate && selectedDate
    ? formatDateMonthYearShort(selectedDate)
    : formatDateShort(new Date());

  return (
    <LinearGradient
      colors={gradientColors}
      locations={[0.05, 0.7]}
      style={styles.gradient}
      start={{ x: 1, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
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
        </View>
      </SafeAreaView>
      <SelectDateModal
        visible={isDatePickerVisible}
        onClose={handleCloseDatePicker}
        selectedDate={selectedDate}
        onDateSelect={handleDateSelect}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateButtonText: {
    ...typography.h1,
    textAlign: 'left',
  },
});
