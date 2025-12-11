import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  Platform,
} from 'react-native';
import { Calendar as CalendarIcon, ChevronRight, Pencil } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { FlashList } from '@shopify/flash-list';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference, useColorScheme } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { BottomSheetModal } from '@/components/bottom-sheet-modal';
import { FilledButton } from '@/components/buttons/filled-button';
import { Card } from '@/components/card';
import { Separator } from '@/components/separator';
import { PlatformIcon } from '@/components/platform-icon';
import { SearchBar } from '@/components/search-bar';
import { getClients, scheduleSession, type Client } from '@/services/client-service';

type NewSessionModalProps = {
  visible: boolean;
  onClose: () => void;
};

type Page = 'client-selection' | 'session-details';



export const NewSessionModal = ({ visible, onClose }: NewSessionModalProps) => {
  const { colors: themeColors } = useThemePreference();
  const colorScheme = useColorScheme();
  const { t } = useTranslations();
  
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
  const [currentPage, setCurrentPage] = useState<Page>('client-selection');
  const [searchQuery, setSearchQuery] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [fromTime, setFromTime] = useState<Date | null>(null);
  const [toTime, setToTime] = useState<Date | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAndroidDatePicker, setShowAndroidDatePicker] = useState(false);
  const [showAndroidFromTimePicker, setShowAndroidFromTimePicker] = useState(false);
  const [showAndroidToTimePicker, setShowAndroidToTimePicker] = useState(false);

  // Load clients when modal opens and initialize date
  useEffect(() => {
    if (visible) {
      const loadClients = async () => {
        try {
          const clientsData = await getClients();
          setClients(clientsData);
        } catch (error) {
          console.error('Failed to load clients:', error);
        }
      };
      loadClients();
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
    }
  }, [visible]);

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setCurrentPage('client-selection');
      setSearchQuery('');
      setSelectedClient(null);
      setSelectedDate(null);
      setFromTime(null);
      setToTime(null);
    }
  }, [visible]);

  // Filter clients based on search query
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) {
      return clients;
    }
    const query = searchQuery.toLowerCase();
    return clients.filter(
      (client) =>
        client.firstName.toLowerCase().includes(query) ||
        client.lastName.toLowerCase().includes(query) ||
        client.fullName.toLowerCase().includes(query)
    );
  }, [clients, searchQuery]);

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    setCurrentPage('session-details');
  };

  const handleEditClient = () => {
    setCurrentPage('client-selection');
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
    if (!selectedClient || !selectedDate || !fromTime || !toTime || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      await scheduleSession({
        clientId: selectedClient.id,
        date: selectedDate,
        fromTime,
        toTime,
      });
      onClose();
    } catch (error) {
      console.error('Failed to schedule session:', error);
    } finally {
      setIsSubmitting(false);
    }
  };


  const formatSubtitle = (client: Client): string => {
    const parts: string[] = [];

    if (client.age) {
      parts.push(`${client.age} ${t('clients.years')}`);
    }

    if (client.gender && client.gender !== 'prefer-not-to-say') {
      parts.push(client.gender);
    }

    if (client.type) {
      const typeLabel =
        client.type === 'in-person'
          ? t('clients.addClientModal.inPerson')
          : client.type === 'online'
            ? t('clients.addClientModal.online')
            : t('clients.addClientModal.hybrid');
      parts.push(typeLabel);
    }

    return parts.join(' · ');
  };

  const renderClientCard = ({ item, index }: { item: Client; index: number }) => {
    const isLastItem = index === filteredClients.length - 1;

    return (
      <View style={styles.cardWrapper}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => handleClientSelect(item)}>
          <Card style={[isLastItem ? { marginBottom: 60 } : undefined, styles.cardContainer]}>
            <View style={styles.cardContent}>
              {item.avatar ? (
                <Image
                  source={{ uri: item.avatar }}
                  style={[styles.avatar, { borderTopLeftRadius: 18, borderBottomLeftRadius: 18 }]}
                />
              ) : (
                <View
                  style={[
                    styles.avatar,
                    styles.avatarPlaceholder,
                    { backgroundColor: themeColors.border, borderTopLeftRadius: 18, borderBottomLeftRadius: 18 },
                  ]}
                />
              )}
              <View style={styles.clientInfo}>
                <Text style={[styles.clientName, { color: themeColors.text }]}>{item.fullName}</Text>
                <Text style={[styles.clientSubtitle, { color: themeColors.mutedText }]}>
                  {formatSubtitle(item)}
                </Text>
              </View>
              <View style={styles.chevronContainer}>
                <PlatformIcon
                  sf="chevron.right"
                  IconComponent={ChevronRight}
                  size={iconSizes.navigationChevrons}
                  color={themeColors.mutedText}
                />
              </View>
            </View>
          </Card>
        </TouchableOpacity>
      </View>
    );
  };

  // Render client selection page
  const renderClientSelectionPage = () => (
    <View style={styles.pageContainer}>
      {/* Fixed Search Bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.inputGroup}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('calendar.newSession.searchPlaceholder')}
          />
        </View>
      </View>

      {/* Scrollable Client List */}
      <View style={styles.listContainer}>
        <FlashList<Client>
          data={filteredClients}
          renderItem={renderClientCard}
          keyExtractor={(item: Client) => item.id}
          // @ts-ignore - estimatedItemSize is a valid FlashList prop but types may be outdated
          estimatedItemSize={88}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  );

  // Render session details page
  const renderSessionDetailsPage = () => {
    if (!selectedClient) return null;

    // For date display, use selectedDate or today
    const dateForDisplay = selectedDate || new Date();
    const dateText = formatDate(dateForDisplay);

    return (
      <View style={styles.pageContainer}>
        {/* Overview Card */}
        <Card style={styles.overviewCard}>
          <TouchableOpacity activeOpacity={0.7} onPress={handleEditClient}>
            <View style={styles.athleteNameRow}>
              <Text style={[styles.athleteName, { color: themeColors.text }]}>{selectedClient.fullName}</Text>
              <PlatformIcon
                sf="pencil"
                IconComponent={Pencil}
                size={iconSizes.modalIcons}
                color={themeColors.mutedText}
              />
            </View>
          </TouchableOpacity>
          <Separator />
          <View style={styles.dateTimeRow}>
            <View style={styles.dateContainer}>
              <PlatformIcon
                sf="calendar"
                IconComponent={CalendarIcon}
                size={16}
                color={themeColors.mutedText}
              />
              <Text style={[styles.dateText, { color: themeColors.text }]}>{dateText}</Text>
            </View>
            {fromTime && toTime && (
              <Text style={[styles.timeRangeText, { color: themeColors.text }]}>
                {`${formatTime(fromTime)} - ${formatTime(toTime)}`}
              </Text>
            )}
          </View>
        </Card>

        {/* Date and Time Pickers */}
        <View style={styles.inputsContainer}>
          {/* Date Picker */}
          <View style={styles.pickerContainer}>
            <Text style={[styles.inputLabel, { color: themeColors.text }]}>{t('calendar.newSession.labels.on')}</Text>
            {Platform.OS === 'ios' ? (
              <View style={[styles.pickerWrapper, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                <View style={styles.pickerInner}>
                  <DateTimePicker
                    value={selectedDate || new Date()}
                    mode="date"
                    display="compact"
                    onChange={handleDateChange}
                    minimumDate={new Date()}
                    textColor={iosPickerTextColor}
                    themeVariant={iosPickerThemeVariant}
                  />
                </View>
              </View>
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

          {/* From Time Picker */}
          <View style={styles.pickerContainer}>
            <Text style={[styles.inputLabel, { color: themeColors.text }]}>{t('calendar.newSession.labels.from')}</Text>
            {Platform.OS === 'ios' ? (
              <View style={[styles.pickerWrapper, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                <View style={styles.pickerInner}>
                  <DateTimePicker
                    value={fromTime || new Date()}
                    mode="time"
                    display="default"
                    onChange={handleFromTimeChange}
                    minuteInterval={15}
                    is24Hour={false}
                    textColor={iosPickerTextColor}
                    themeVariant={iosPickerThemeVariant}
                  />
                </View>
              </View>
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

          {/* To Time Picker */}
          <View style={styles.pickerContainer}>
            <Text style={[styles.inputLabel, { color: themeColors.text }]}>{t('calendar.newSession.labels.till')}</Text>
            {              Platform.OS === 'ios' ? (
                <View style={[styles.pickerWrapper, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                  <View style={styles.pickerInner}>
                    <DateTimePicker
                      value={toTime || fromTime || new Date()}
                      mode="time"
                      display="compact"
                      onChange={handleToTimeChange}
                      minimumDate={fromTime || undefined}
                      minuteInterval={15}
                      textColor={iosPickerTextColor}
                      themeVariant={iosPickerThemeVariant}
                    />
                  </View>
                </View>
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
        </View>

        {/* Complete Button */}
        <View style={styles.completeButtonContainer}>
          <FilledButton
            label={t('calendar.newSession.complete')}
            onPress={handleComplete}
            disabled={isSubmitting}
            style={styles.completeButton}
          />
        </View>
      </View>
    );
  };

  return (
    <>
      <BottomSheetModal
        visible={visible}
        onClose={onClose}
        title={t('calendar.newSession.title')}
        height="90%"
        skipScrollView={true}
      >
        {currentPage === 'client-selection' ? renderClientSelectionPage() : renderSessionDetailsPage()}
      </BottomSheetModal>

    </>
  );
};


const styles = StyleSheet.create({
  pageContainer: {
    flex: 1,
  },
  searchBarContainer: {
    paddingBottom: 16,
    backgroundColor: 'transparent',
  },
  inputGroup: {
    marginBottom: 0,
  },
  label: {
    ...typography.p4,
    marginBottom: 8,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 32,
  },
  cardWrapper: {
    paddingHorizontal: 0,
  },
  cardContainer: {
    overflow: 'hidden',
    paddingLeft: 0,
    paddingRight: 16,
    paddingTop: 0,
    paddingBottom: 0,
    height: 88,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'stretch',
    height: 88,
  },
  avatar: {
    width: 80,
    marginRight: 12,
    marginLeft: 0,
    alignSelf: 'stretch',
  },
  avatarPlaceholder: {
    backgroundColor: '#e0e0e0',
  },
  clientInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  clientName: {
    ...typography.p1,
    fontWeight: '600',
    marginBottom: 4,
  },
  clientSubtitle: {
    ...typography.p4,
  },
  chevronContainer: {
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overviewCard: {
    marginBottom: 24,
    paddingVertical: 12,
  },
  athleteNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  athleteName: {
    ...typography.p3,
    flex: 1,
  },
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    ...typography.p3,
  },
  timeRangeText: {
    ...typography.p3,
  },
  inputsContainer: {
    marginBottom: 24,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  pickerContainer: {
    marginBottom: 24,
    width: '100%',
    alignItems: 'center',
  },
  pickerWrapper: {
    borderRadius: 18,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    width: '100%',
    maxWidth: '100%',
    marginLeft: Platform.OS === 'ios' ? -8 : 0,
  },
  pickerInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  androidPickerWrapper: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  androidPickerButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 35,
    padding: 8,
  },
  pickerValue: {
    ...typography.h5,
  },
  inputLabel: {
    ...typography.h6,
    fontWeight: '600',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  disabledPickerText: {
    ...typography.p3,
    padding: 20,
    textAlign: 'center',
  },
  completeButtonContainer: {
    marginTop: 'auto',
    paddingBottom: 20,
    marginBottom: 20,
  },
  completeButton: {
    width: '100%',
    minHeight: 55,
  },
});
