import React, { useState } from 'react';
import { StyleSheet, Text, View, Platform, ScrollView, Dimensions } from 'react-native';
import { PressableOpacity } from 'pressto';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, X, ChevronRight, ChevronDown } from 'lucide-react-native';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { DropdownMenuWrapper, type DropdownMenuOption } from '@/components/ui/dropdown-menu';
import { useModalCallbacks } from '@/stores';

type RepeatData = {
  type: 'weekly' | 'monthly';
  every?: number;
  for?: number | 'ever';
  weekdays?: string[];
  monthDays?: number[];
};

type RepeatOption = 'weekly' | 'monthly';

type Weekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

const WEEKDAYS: { key: Weekday; label: string }[] = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

export default function RepeatOptionsModal() {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const { triggerRepeatSelect, getRepeatData } = useModalCallbacks();
  const screenWidth = Dimensions.get('window').width;
  // Content has 16px padding on each side, card has 16px padding, so full width needs to account for both
  const fullWidth = screenWidth - 32; // Subtract content padding (16px each side)

  // Initialize with existing repeat data if available
  const existingRepeatData = getRepeatData();
  const [selectedOption, setSelectedOption] = useState<RepeatOption>(
    (existingRepeatData?.type as RepeatOption) || 'weekly'
  );
  const [everyWeeks, setEveryWeeks] = useState<number>(
    existingRepeatData?.every || 1
  );
  const [everyMonths, setEveryMonths] = useState<number>(
    (existingRepeatData?.type === 'monthly' && existingRepeatData?.every) ? existingRepeatData.every : 1
  );
  const [forWeeks, setForWeeks] = useState<number | 'ever'>(
    existingRepeatData?.for || 'ever'
  );
  const [selectedWeekdays, setSelectedWeekdays] = useState<Set<Weekday>>(
    existingRepeatData?.weekdays ? new Set(existingRepeatData.weekdays as Weekday[]) : new Set()
  );
  const [selectedMonthDays, setSelectedMonthDays] = useState<Set<number>>(
    existingRepeatData?.type === 'monthly' && existingRepeatData?.monthDays
      ? new Set(existingRepeatData.monthDays)
      : new Set([new Date().getDate()]) // Default to today's date
  );

  const handleClose = () => {
    router.back();
  };

  const handleSave = () => {
    if (selectedOption === 'weekly' && selectedWeekdays.size > 0) {
      const repeatData: RepeatData = {
        type: 'weekly',
        every: everyWeeks,
        for: forWeeks,
        weekdays: Array.from(selectedWeekdays),
      };
      triggerRepeatSelect(repeatData);
      router.back();
    } else if (selectedOption === 'monthly') {
      const repeatData: RepeatData = {
        type: 'monthly',
        every: everyMonths,
        monthDays: Array.from(selectedMonthDays),
      };
      triggerRepeatSelect(repeatData);
      router.back();
    }
  };


  const everyDropdownOptions: DropdownMenuOption[] = [1, 2, 3, 4].map((num) => ({
    label: num === 1 ? t('calendar.newSession.repeatOptions.weekCapitalized') : `${num} ${t('calendar.newSession.repeatOptions.weeks')}`,
    onPress: () => setEveryWeeks(num),
  }));

  const forDropdownOptions: DropdownMenuOption[] = [
    {
      label: t('calendar.newSession.repeatOptions.ever'),
      onPress: () => setForWeeks('ever'),
    },
    ...Array.from({ length: 52 }, (_, i) => i + 1).map((num) => ({
      label: num === 1 ? `${num} ${t('calendar.newSession.repeatOptions.week')}` : `${num} ${t('calendar.newSession.repeatOptions.weeks')}`,
      onPress: () => setForWeeks(num),
    })),
  ];

  const everyMonthDropdownOptions: DropdownMenuOption[] = Array.from({ length: 12 }, (_, i) => i + 1).map((num) => ({
    label: num === 1 ? `${num} ${t('calendar.newSession.repeatOptions.month')}` : `${num} ${t('calendar.newSession.repeatOptions.months')}`,
    onPress: () => setEveryMonths(num),
  }));

  const formatEveryMonthText = (months: number): string => {
    if (months === 1) return t('calendar.newSession.repeatOptions.monthCapitalized');
    return `${months} ${t('calendar.newSession.repeatOptions.months')}`;
  };

  const toggleWeekday = (weekday: Weekday) => {
    const newSet = new Set(selectedWeekdays);
    if (newSet.has(weekday)) {
      newSet.delete(weekday);
    } else {
      newSet.add(weekday);
    }
    setSelectedWeekdays(newSet);
  };

  const toggleMonthDay = (day: number) => {
    const newSet = new Set(selectedMonthDays);
    if (newSet.has(day)) {
      newSet.delete(day);
    } else {
      newSet.add(day);
    }
    setSelectedMonthDays(newSet);
  };

  const canSave = (selectedOption === 'weekly' && selectedWeekdays.size > 0) || selectedOption === 'monthly';

  const formatEveryText = (weeks: number): string => {
    if (weeks === 1) return t('calendar.newSession.repeatOptions.weekCapitalized');
    return `${weeks} ${t('calendar.newSession.repeatOptions.weeks')}`;
  };

  const formatForText = (weeks: number | 'ever'): string => {
    if (weeks === 'ever') return t('calendar.newSession.repeatOptions.ever');
    if (weeks === 1) return `${weeks} ${t('calendar.newSession.repeatOptions.week')}`;
    return `${weeks} ${t('calendar.newSession.repeatOptions.weeks')}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? 20 + insets.top : 20, backgroundColor: themeColors.background }]}>
        <IconButton
          icon={{ sf: 'xmark', IconComponent: X }}
          onPress={handleClose}
          size="md"
          color={themeColors.text}
        />
        <Text style={[styles.title, { color: themeColors.text }]}>{t('calendar.newSession.repeatOptions.title')}</Text>
        <IconButton
          icon={{ sf: 'checkmark', IconComponent: Check }}
          onPress={handleSave}
          size="md"
          color={canSave ? themeColors.primary : themeColors.mutedText}
          disabled={!canSave}
          style={!canSave ? { opacity: 0.5 } : undefined}
        />
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Button Group */}
        <View style={[styles.buttonGroup, { backgroundColor: themeColors.surfaceSecondary }]}>
          <PressableOpacity
            style={[
              styles.buttonGroupButton,
              selectedOption === 'weekly' && [
                styles.buttonGroupButtonActive,
                { backgroundColor: themeColors.background },
              ],
            ]}
            onPress={() => setSelectedOption('weekly')}
          >
            <Text
              style={[
                styles.buttonGroupText,
                { color: selectedOption === 'weekly' ? themeColors.text : themeColors.mutedText },
                selectedOption === 'weekly' && styles.buttonGroupTextActive,
              ]}
            >
              {t('calendar.newSession.repeatOptions.weekly')}
            </Text>
          </PressableOpacity>
          <PressableOpacity
            style={[
              styles.buttonGroupButton,
              selectedOption === 'monthly' && [
                styles.buttonGroupButtonActive,
                { backgroundColor: themeColors.background },
              ],
            ]}
            onPress={() => setSelectedOption('monthly')}
          >
            <Text
              style={[
                styles.buttonGroupText,
                { color: selectedOption === 'monthly' ? themeColors.text : themeColors.mutedText },
                selectedOption === 'monthly' && styles.buttonGroupTextActive,
              ]}
            >
              {t('calendar.newSession.repeatOptions.monthly')}
            </Text>
          </PressableOpacity>
        </View>

        {selectedOption === 'weekly' && (
          <>
            {/* Every/For Card */}
            <Card style={styles.optionsCard}>
              <DropdownMenuWrapper options={everyDropdownOptions}>
                <PressableOpacity
                  style={styles.optionRow}
                  onPress={() => { }}
                >
                  <Text style={[styles.optionLabel, { color: themeColors.text }]}>
                    {t('calendar.newSession.repeatOptions.every')}
                  </Text>
                  <View style={styles.optionValueContainer}>
                    <Text style={[styles.optionValue, { color: themeColors.primary }]}>
                      {formatEveryText(everyWeeks)}
                    </Text>
                    <PlatformIcon
                      sf="chevron.down"
                      IconComponent={ChevronDown}
                      size={iconSizes.smallIcons}
                      color={themeColors.mutedText}
                    />
                  </View>
                </PressableOpacity>
              </DropdownMenuWrapper>
              <Separator />
              <DropdownMenuWrapper options={forDropdownOptions}>
                <PressableOpacity
                  style={styles.optionRow}
                  onPress={() => { }}
                >
                  <Text style={[styles.optionLabel, { color: themeColors.text }]}>
                    {t('calendar.newSession.repeatOptions.for')}
                  </Text>
                  <View style={styles.optionValueContainer}>
                    <Text style={[styles.optionValue, { color: themeColors.primary }]}>
                      {formatForText(forWeeks)}
                    </Text>
                    <PlatformIcon
                      sf="chevron.down"
                      IconComponent={ChevronDown}
                      size={iconSizes.smallIcons}
                      color={themeColors.mutedText}
                    />
                  </View>
                </PressableOpacity>
              </DropdownMenuWrapper>
            </Card>

            {/* Weekdays Card */}
            <Card style={styles.weekdaysCard}>
              <View style={styles.weekdayRow}>
                <Text style={[styles.weekdayLabel, { color: themeColors.text }]}>
                  {t('calendar.newSession.repeatOptions.on')}
                </Text>
              </View>
              <View style={[styles.fullWidthDivider, { backgroundColor: themeColors.border, marginLeft: -16, marginRight: -16, width: fullWidth }]} />
              {WEEKDAYS.map((weekday, index) => {
                const isSelected = selectedWeekdays.has(weekday.key);
                const isLast = index === WEEKDAYS.length - 1;

                return (
                  <View key={weekday.key}>
                    <PressableOpacity
                      style={styles.weekdayRow}
                      onPress={() => toggleWeekday(weekday.key)}
                    >
                      <Text style={[styles.weekdayLabel, { color: themeColors.text }]}>
                        {t(`calendar.newSession.repeatOptions.weekdays.${weekday.key}`)}
                      </Text>
                      {isSelected && (
                        <PlatformIcon
                          sf="checkmark"
                          IconComponent={Check}
                          size={iconSizes.modalIcons}
                          color={themeColors.primary}
                        />
                      )}
                    </PressableOpacity>
                    {!isLast && <Separator />}
                  </View>
                );
              })}
            </Card>
          </>
        )}

        {selectedOption === 'monthly' && (
          <>
            {/* Every Month Card */}
            <Card style={styles.optionsCard}>
              <DropdownMenuWrapper options={everyMonthDropdownOptions}>
                <PressableOpacity
                  style={styles.optionRow}
                  onPress={() => { }}
                >
                  <Text style={[styles.optionLabel, { color: themeColors.text }]}>
                    {t('calendar.newSession.repeatOptions.every')}
                  </Text>
                  <View style={styles.optionValueContainer}>
                    <Text style={[styles.optionValue, { color: themeColors.primary }]}>
                      {formatEveryMonthText(everyMonths)}
                    </Text>
                    <PlatformIcon
                      sf="chevron.down"
                      IconComponent={ChevronDown}
                      size={iconSizes.smallIcons}
                      color={themeColors.mutedText}
                    />
                  </View>
                </PressableOpacity>
              </DropdownMenuWrapper>
            </Card>

            {/* Each Card */}
            <Card style={styles.eachCard}>
              <PressableOpacity
                style={styles.eachRow}
                enabled={false}
              >
                <Text style={[styles.eachLabel, { color: themeColors.text }]}>
                  {t('calendar.newSession.repeatOptions.each')}
                </Text>
                <PlatformIcon
                  sf="checkmark"
                  IconComponent={Check}
                  size={iconSizes.modalIcons}
                  color={themeColors.primary}
                />
              </PressableOpacity>
              <View style={[styles.fullWidthDivider, { backgroundColor: themeColors.border, marginLeft: -16, marginRight: -16, width: fullWidth }]} />
              <View style={[styles.calendarGrid, { marginLeft: -16, marginRight: -16, width: fullWidth }]}>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                  const isSelected = selectedMonthDays.has(day);
                  const isLastInRow = day % 7 === 0;
                  const isLastRow = day > 28;
                  return (
                    <PressableOpacity
                      key={day}
                      style={[
                        styles.calendarDay,
                        {
                          borderRightWidth: isLastInRow ? 0 : 1,
                          borderBottomWidth: isLastRow ? 0 : 1,
                          borderColor: themeColors.border,
                        },
                        isSelected && { backgroundColor: themeColors.primary },
                      ]}
                      onPress={() => toggleMonthDay(day)}
                    >
                      <Text
                        style={[
                          styles.calendarDayText,
                          { color: isSelected ? themeColors.primaryForeground : themeColors.text },
                        ]}
                      >
                        {day}
                      </Text>
                    </PressableOpacity>
                  );
                })}
              </View>
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderTopWidth: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: {
    ...typography.h6,
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 0,
  },
  buttonGroup: {
    flexDirection: 'row',
    borderRadius: 28,
    padding: 4,
    gap: 4,
    marginBottom: 16,
  },
  buttonGroupButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonGroupButtonActive: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  buttonGroupText: {
    ...typography.p2,
    fontWeight: '600',
  },
  buttonGroupTextActive: {
    fontWeight: '700',
  },
  optionsCard: {
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    minHeight: 44,
  },
  optionLabel: {
    ...typography.p2,
  },
  optionValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionValue: {
    ...typography.p2,
    fontWeight: '600',
  },
  weekdaysCard: {
    marginBottom: 24,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    minHeight: 44,
  },
  weekdayLabel: {
    ...typography.p2,
  },
  eachCard: {
    marginBottom: 16,
    paddingVertical: 0,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  eachRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 44,
  },
  eachLabel: {
    ...typography.p2,
  },
  calendarContainer: {
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 0,
  },
  calendarLabel: {
    ...typography.p2,
    marginBottom: 12,
  },
  fullWidthDivider: {
    height: 1,
    width: '100%',
    marginBottom: 0,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 0,
    borderRadius: 0,
    overflow: 'hidden',
    width: '100%',
  },
  calendarDay: {
    width: '14.285%', // 7 columns = ~14.285% each
    minWidth: 0,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRightWidth: 1,
    borderBottomWidth: 1,
  },
  calendarDayText: {
    ...typography.p2,
    fontWeight: '500',
  },
});
