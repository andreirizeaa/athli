import React, { useState, useEffect, useImperativeHandle, forwardRef, useRef } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Platform,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { ChevronRight, ChevronDown } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference, useColorScheme } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { useModalCallbacks } from '@/contexts/modal-callbacks';
import { Card } from '@/components/card';
import { Separator } from '@/components/separator';
import { PlatformIcon } from '@/components/platform-icon';
import { DropdownMenu, type DropdownMenuOption } from '@/components/dropdown-menu';
import type { Client } from '@/services/client-service';
import { scheduleSession } from '@/services/calendar-service';

type NewSessionContentProps = {
  onClose: () => void;
};

export type NewSessionContentRef = {
  canComplete: boolean;
  handleComplete: () => Promise<void>;
};

export const NewSessionContent = forwardRef<NewSessionContentRef, NewSessionContentProps>(
  ({ onClose }, ref) => {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const colorScheme = useColorScheme();
  const { t } = useTranslations();
  const { setClientSelectCallback, setTypeSelectCallback, setRepeatSelectCallback, getRepeatData, setRepeatData: clearStoredRepeatData } = useModalCallbacks();
  
  // iOS picker styling based on theme
  const iosPickerTextColor = colorScheme === 'dark' ? '#FFFFFF' : '#000000';
  const iosPickerThemeVariant = colorScheme === 'dark' ? 'dark' : 'light';

  const formatTime = (date: Date): string => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const period = hours >= 12 ? t('calendar.newSession.time.pm') : t('calendar.newSession.time.am');
    const displayHours = hours % 12 || 12;
    if (minutes === 0) {
      return `${displayHours} ${period}`;
    }
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const formatDate = (date: Date): string => {
    const day = date.getDate();
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
    ];
    const monthKey = monthKeys[date.getMonth()];
    const monthName = t(`calendar.newSession.months.${monthKey}`);
    return `${day} ${monthName}`;
  };

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [fromTime, setFromTime] = useState<Date | null>(null);
  const [toTime, setToTime] = useState<Date | null>(null);
  const [meetingInfo, setMeetingInfo] = useState<string>('');
  const [repeatMode, setRepeatMode] = useState<'never' | 'custom'>('never');
  const [repeatData, setRepeatData] = useState<{
    type: 'weekly' | 'monthly';
    every?: number;
    for?: number | 'ever';
    weekdays?: string[];
    monthDays?: number[];
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [repeatDropdownVisible, setRepeatDropdownVisible] = useState(false);
  const repeatRowRef = useRef<View>(null);
  const [repeatButtonPosition, setRepeatButtonPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [showAndroidDatePicker, setShowAndroidDatePicker] = useState(false);
  const [showAndroidFromTimePicker, setShowAndroidFromTimePicker] = useState(false);
  const [showAndroidToTimePicker, setShowAndroidToTimePicker] = useState(false);

  // Initialize date and time when component mounts
  useEffect(() => {
    // Initialize with today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setSelectedDate(today);
    
    // Initialize with default time range: next full hour to 30 minutes after
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1, 0, 0, 0);
    setFromTime(nextHour);
    
    const toTimeDefault = new Date(nextHour);
    toTimeDefault.setMinutes(toTimeDefault.getMinutes() + 30);
    setToTime(toTimeDefault);

    // Load existing repeat data if available
    const existingRepeatData = getRepeatData();
    if (existingRepeatData) {
      setRepeatData(existingRepeatData);
      setRepeatMode('custom');
    }
  }, [getRepeatData]);

  // Set up callbacks for modal selections
  useEffect(() => {
    setClientSelectCallback((client: Client) => {
      setSelectedClient(client);
    });

    setTypeSelectCallback((type: string) => {
      setSelectedType(type);
    });

    setRepeatSelectCallback((data: {
      type: 'weekly' | 'monthly';
      every?: number;
      for?: number | 'ever';
      weekdays?: string[];
      monthDays?: number[];
    }) => {
      setRepeatData(data);
      setRepeatMode('custom');
    });
  }, [setClientSelectCallback, setTypeSelectCallback, setRepeatSelectCallback]);

  const handleOpenRepeatDropdown = () => {
    repeatRowRef.current?.measure((x, y, width, height, pageX, pageY) => {
      setRepeatButtonPosition({ x: pageX, y: pageY, width, height });
      setRepeatDropdownVisible(true);
    });
  };

  const handleRepeatOptionSelect = (option: 'never' | 'custom') => {
    setRepeatDropdownVisible(false);
    if (option === 'custom') {
      // Navigate to repeat options modal
      // The mode will only change to 'custom' if they click the tick in the modal
      router.push({ pathname: '/modals/calendar/repeat-options-modal', params: {} });
    } else {
      setRepeatMode('never');
      setRepeatData(null);
      clearStoredRepeatData(null);
    }
  };

  const handleEditRepeat = () => {
    router.push({ pathname: '/modals/calendar/repeat-options-modal', params: {} });
  };

  const repeatDropdownOptions: DropdownMenuOption[] = [
    {
      label: t('calendar.newSession.repeatOptions.never'),
      onPress: () => handleRepeatOptionSelect('never'),
    },
    {
      label: t('calendar.newSession.repeatOptions.custom'),
      onPress: () => handleRepeatOptionSelect('custom'),
    },
  ];

  const handleOpenClientModal = () => {
    router.push({
      pathname: '/modals/client/search-client-modal',
      params: {},
    });
  };

  const handleOpenTypeModal = () => {
    router.push({
      pathname: '/modals/calendar/session-type-modal',
      params: {},
    });
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowAndroidDatePicker(false);
      if (date && event.type !== 'dismissed') {
        setSelectedDate(date);
      }
    } else {
      if (date) {
        setSelectedDate(date);
      }
    }
  };

  const handleFromTimeChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowAndroidFromTimePicker(false);
      if (date && event.type !== 'dismissed') {
        setFromTime(date);
        // If toTime is before fromTime, reset toTime
        if (toTime && date >= toTime) {
          setToTime(null);
        }
      }
    } else {
      if (date) {
        setFromTime(date);
        // If toTime is before fromTime, reset toTime
        if (toTime && date >= toTime) {
          setToTime(null);
        }
      }
    }
  };

  const handleToTimeChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowAndroidToTimePicker(false);
      if (date && event.type !== 'dismissed') {
        // Prevent selecting time before fromTime
        if (fromTime && date <= fromTime) {
          return;
        }
        setToTime(date);
      }
    } else {
      if (date) {
        // Prevent selecting time before fromTime
        if (fromTime && date <= fromTime) {
          return;
        }
        setToTime(date);
      }
    }
  };

  const handleComplete = async () => {
    if (!selectedClient || !selectedType || !selectedDate || !fromTime || !toTime || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      await scheduleSession({
        clientId: selectedClient.id,
        type: selectedType,
        date: selectedDate,
        fromTime,
        toTime,
        meetingInfo: meetingInfo.trim() || undefined,
        repeat: repeatData || undefined,
      });
      // Clear repeat data after successful save
      if (repeatData) {
        clearStoredRepeatData(null);
      }
      onClose();
    } catch (error) {
      console.error('Failed to schedule session:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatRepeatFrequency = (data: {
    type: 'weekly' | 'monthly';
    every?: number;
    for?: number | 'ever';
    weekdays?: string[];
    monthDays?: number[];
  }): string => {
    if (data.type === 'weekly' && data.weekdays && data.weekdays.length > 0) {
      const everyText = data.every === 1 
        ? t('calendar.newSession.repeatOptions.everyWeek')
        : `${t('calendar.newSession.repeatOptions.every')} ${data.every || 1} ${t('calendar.newSession.repeatOptions.weeks')}`;
      
      const weekdayLabels = data.weekdays.map(day => 
        t(`calendar.newSession.repeatOptions.weekdays.${day}`)
      );
      
      let weekdaysText = '';
      if (weekdayLabels.length === 1) {
        weekdaysText = weekdayLabels[0];
      } else if (weekdayLabels.length === 2) {
        weekdaysText = `${weekdayLabels[0]} ${t('calendar.newSession.repeatOptions.and')} ${weekdayLabels[1]}`;
      } else {
        const lastDay = weekdayLabels.pop();
        weekdaysText = `${weekdayLabels.join(', ')}, ${t('calendar.newSession.repeatOptions.and')} ${lastDay}`;
      }
      
      const forText = data.for === 'ever'
        ? ''
        : data.for === 1
          ? ` ${t('calendar.newSession.repeatOptions.for')} ${t('calendar.newSession.repeatOptions.oneWeek')}`
          : ` ${t('calendar.newSession.repeatOptions.for')} ${data.for} ${t('calendar.newSession.repeatOptions.weeks')}`;
      
      return `${everyText} ${t('calendar.newSession.repeatOptions.on')} ${weekdaysText}${forText}`;
    } else if (data.type === 'monthly') {
      const everyText = data.every === 1 
        ? t('calendar.newSession.repeatOptions.everyMonth')
        : `${t('calendar.newSession.repeatOptions.every')} ${data.every || 1} ${t('calendar.newSession.repeatOptions.months')}`;
      
      if (data.monthDays && data.monthDays.length > 0) {
        const sortedDays = [...data.monthDays].sort((a, b) => a - b);
        let daysText = '';
        if (sortedDays.length === 1) {
          daysText = `${sortedDays[0]}`;
        } else if (sortedDays.length === 2) {
          daysText = `${sortedDays[0]} ${t('calendar.newSession.repeatOptions.and')} ${sortedDays[1]}`;
        } else {
          const lastDay = sortedDays.pop();
          daysText = `${sortedDays.join(', ')}, ${t('calendar.newSession.repeatOptions.and')} ${lastDay}`;
        }
        return `${everyText} ${t('calendar.newSession.repeatOptions.onThe')} ${daysText}`;
      }
      return everyText;
    }
    return '';
  };

  const canComplete = selectedClient !== null && selectedType !== null;

  // Expose canComplete and handleComplete to parent via ref
  useImperativeHandle(ref, () => ({
    canComplete,
    handleComplete,
  }), [canComplete]);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
      {/* Top Card with Client and Type */}
      <Card style={styles.topCard}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleOpenClientModal}
          style={styles.rowButton}
        >
          <View style={styles.rowButtonContent}>
            {selectedClient ? (
              <View style={styles.clientRow}>
                {selectedClient.avatar ? (
                  <ExpoImage
                    source={{ uri: selectedClient.avatar }}
                    style={styles.clientAvatar}
                  />
                ) : (
                  <View
                    style={[
                      styles.clientAvatar,
                      styles.avatarPlaceholder,
                      { backgroundColor: themeColors.border },
                    ]}
                  />
                )}
                <Text style={[styles.clientName, { color: themeColors.text }]}>
                  {selectedClient.fullName}
                </Text>
              </View>
            ) : (
              <Text style={[styles.rowButtonText, { color: themeColors.mutedText }]}>
                {t('calendar.newSession.client')}
              </Text>
            )}
            <PlatformIcon
              sf="chevron.right"
              IconComponent={ChevronRight}
              size={iconSizes.navigationChevrons}
              color={themeColors.mutedText}
            />
          </View>
        </TouchableOpacity>
        <Separator />
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleOpenTypeModal}
          style={styles.rowButton}
        >
          <View style={styles.rowButtonContent}>
            <Text style={[selectedType ? styles.selectedTypeText : styles.rowButtonText, { color: selectedType ? themeColors.text : themeColors.mutedText }]}>
              {selectedType || t('calendar.newSession.type')}
            </Text>
            <PlatformIcon
              sf="chevron.right"
              IconComponent={ChevronRight}
              size={iconSizes.navigationChevrons}
              color={themeColors.mutedText}
            />
          </View>
        </TouchableOpacity>
      </Card>

      {/* Date and Time Card */}
      <Card style={styles.dateTimeCard}>
        {/* On Row */}
        <View style={styles.pickerRow}>
          <Text style={[styles.pickerLabel, { color: themeColors.text }]}>
            {t('calendar.newSession.labels.on')}
          </Text>
          {Platform.OS === 'ios' ? (
            <DateTimePicker
              value={selectedDate || new Date()}
              mode="date"
              display="compact"
              onChange={handleDateChange}
              minimumDate={new Date()}
              textColor={iosPickerTextColor}
              themeVariant={iosPickerThemeVariant}
              style={{ backgroundColor: 'transparent', marginLeft: -8 }}
            />
          ) : (
            <>
              <View style={[styles.androidPickerWrapper, { backgroundColor: themeColors.surfaceSecondary }]}>
                <TouchableOpacity
                  style={styles.androidPickerButton}
                  activeOpacity={0.7}
                  onPress={() => setShowAndroidDatePicker(true)}
                >
                  <Text style={[styles.pickerValue, { color: themeColors.text }]}>
                    {selectedDate ? formatDate(selectedDate) : formatDate(new Date())}
                  </Text>
                </TouchableOpacity>
              </View>
              {showAndroidDatePicker && (
                <DateTimePicker
                  value={selectedDate || new Date()}
                  mode="date"
                  display="calendar"
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                />
              )}
            </>
          )}
        </View>
        <Separator />

        {/* Starts Row */}
        <View style={styles.pickerRow}>
          <Text style={[styles.pickerLabel, { color: themeColors.text }]}>
            {t('calendar.newSession.labels.starts')}
          </Text>
          {Platform.OS === 'ios' ? (
            <DateTimePicker
              value={fromTime || new Date()}
              mode="time"
              display="default"
              onChange={handleFromTimeChange}
              minuteInterval={15}
              is24Hour={false}
              textColor={iosPickerTextColor}
              themeVariant={iosPickerThemeVariant}
              style={{ backgroundColor: 'transparent', marginLeft: -8 }}
            />
          ) : (
            <>
              <View style={[styles.androidPickerWrapper, { backgroundColor: themeColors.surfaceSecondary }]}>
                <TouchableOpacity
                  style={styles.androidPickerButton}
                  activeOpacity={0.7}
                  onPress={() => setShowAndroidFromTimePicker(true)}
                >
                  <Text style={[styles.pickerValue, { color: themeColors.text }]}>
                    {fromTime ? formatTime(fromTime) : formatTime(new Date())}
                  </Text>
                </TouchableOpacity>
              </View>
              {showAndroidFromTimePicker && (
                <DateTimePicker
                  value={fromTime || new Date()}
                  mode="time"
                  display="default"
                  onChange={handleFromTimeChange}
                  minuteInterval={15}
                  is24Hour={false}
                />
              )}
            </>
          )}
        </View>
        <Separator />

        {/* Ends Row */}
        <View style={styles.pickerRow}>
          <Text style={[styles.pickerLabel, { color: themeColors.text }]}>
            {t('calendar.newSession.labels.ends')}
          </Text>
          {Platform.OS === 'ios' ? (
            <DateTimePicker
              value={toTime || fromTime || new Date()}
              mode="time"
              display="compact"
              onChange={handleToTimeChange}
              minimumDate={fromTime || undefined}
              minuteInterval={15}
              textColor={iosPickerTextColor}
              themeVariant={iosPickerThemeVariant}
              style={{ backgroundColor: 'transparent', marginLeft: -8 }}
            />
          ) : (
            <>
              <View style={[styles.androidPickerWrapper, { backgroundColor: themeColors.surfaceSecondary }]}>
                <TouchableOpacity
                  style={styles.androidPickerButton}
                  activeOpacity={0.7}
                  onPress={() => setShowAndroidToTimePicker(true)}
                >
                  <Text style={[styles.pickerValue, { color: themeColors.text }]}>
                    {toTime ? formatTime(toTime) : formatTime(fromTime || new Date())}
                  </Text>
                </TouchableOpacity>
              </View>
              {showAndroidToTimePicker && (
                <DateTimePicker
                  value={toTime || fromTime || new Date()}
                  mode="time"
                  display="default"
                  onChange={handleToTimeChange}
                  minimumDate={fromTime || undefined}
                  minuteInterval={15}
                  is24Hour={false}
                />
              )}
            </>
          )}
        </View>
        <Separator />

        {/* Repeat Row */}
        <View style={styles.pickerRow}>
          <Text style={[styles.pickerLabel, { color: themeColors.text }]}>
            {t('calendar.newSession.labels.repeat')}
          </Text>
          {repeatData ? (
            // Custom repeat is set - show "Custom" with down chevron for dropdown
            <TouchableOpacity
              ref={repeatRowRef}
              activeOpacity={0.7}
              onPress={handleOpenRepeatDropdown}
              style={styles.repeatValueContainer}
            >
              <Text style={[styles.repeatValueText, { color: themeColors.text }]}>
                {t('calendar.newSession.repeatOptions.custom')}
              </Text>
              <PlatformIcon
                sf="chevron.down"
                IconComponent={ChevronDown}
                size={iconSizes.smallIcons}
                color={themeColors.mutedText}
              />
            </TouchableOpacity>
          ) : (
            // No custom repeat - show "Never" with down chevron for dropdown
            <TouchableOpacity
              ref={repeatRowRef}
              activeOpacity={0.7}
              onPress={handleOpenRepeatDropdown}
              style={styles.repeatValueContainer}
            >
              <Text style={[styles.repeatValueText, { color: themeColors.text }]}>
                {t('calendar.newSession.repeatOptions.never')}
              </Text>
              <PlatformIcon
                sf="chevron.down"
                IconComponent={ChevronDown}
                size={iconSizes.smallIcons}
                color={themeColors.mutedText}
              />
            </TouchableOpacity>
          )}
        </View>
        {repeatData && (
          <>
            <Separator />
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleEditRepeat}
              style={styles.repeatInfoContainer}
            >
              <Text style={[styles.repeatFrequencyText, { color: themeColors.mutedText }]}>
                {formatRepeatFrequency(repeatData)}
              </Text>
              <PlatformIcon
                sf="chevron.right"
                IconComponent={ChevronRight}
                size={iconSizes.navigationChevrons}
                color={themeColors.mutedText}
              />
            </TouchableOpacity>
          </>
        )}

        <DropdownMenu
          visible={repeatDropdownVisible}
          onClose={() => setRepeatDropdownVisible(false)}
          options={repeatDropdownOptions}
          anchorPosition={repeatButtonPosition}
          alignRight={true}
          disableModal={false}
        />
      </Card>

      {/* Meeting Information Card */}
      <Card style={styles.meetingInfoCard}>
        <TextInput
          style={[styles.meetingInfoInput, { color: themeColors.text }]}
          placeholder={t('calendar.newSession.meetingInfoPlaceholder')}
          placeholderTextColor={themeColors.mutedText}
          multiline
          value={meetingInfo}
          onChangeText={setMeetingInfo}
          textAlignVertical="top"
        />
      </Card>

      </View>
    </TouchableWithoutFeedback>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topCard: {
    marginBottom: 16,
  },
  rowButton: {
    paddingVertical: 4,
    minHeight: 44,
    justifyContent: 'center',
  },
  rowButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowButtonText: {
    ...typography.p2,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  clientAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  avatarPlaceholder: {
    backgroundColor: '#e0e0e0',
  },
  clientName: {
    ...typography.p2,
    fontWeight: '600',
  },
  selectedTypeText: {
    ...typography.p2,
    fontWeight: '600',
  },
  dateTimeCard: {
    marginBottom: 16,
  },
  meetingInfoCard: {
    marginBottom: 24,
  },
  meetingInfoInput: {
    ...typography.p2,
    minHeight: 100,
    paddingVertical: 12,
    paddingHorizontal: 0,
    borderWidth: 0,
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    minHeight: 44,
  },
  pickerLabel: {
    ...typography.p2,
  },
  androidPickerWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  androidPickerButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 35,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pickerValue: {
    ...typography.p2,
  },
  repeatValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  repeatValueText: {
    ...typography.p2,
  },
  repeatInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  repeatFrequencyText: {
    ...typography.p3,
    flex: 1,
  },
});
