import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
  Modal,
  Animated,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { hapticFeedback } from '../../../utils/haptic';
import i18n from '../../../utils/i18n';
import { X } from 'lucide-react-native';
import { track } from '../../../services/analytics';

interface DateRange {
  from: { month: number; year: number } | null;
  to: { month: number; year: number } | null;
}

interface DateRangeModalProps {
  isVisible: boolean;
  onClose: () => void;
  dateRange: DateRange;
  onDateRangeChange: (newDateRange: DateRange) => void;
  onReset: () => void;
  title?: string;
}

export function DateRangeModal({
  isVisible,
  onClose,
  dateRange,
  onDateRangeChange,
  onReset,
  title = i18n.t('performance.editDateRange'),
}: DateRangeModalProps) {
  const [shouldRender, setShouldRender] = React.useState(isVisible);
  const fadeOpacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      fadeOpacity.setValue(0);
      Animated.timing(fadeOpacity, { toValue: 1, duration: 100, useNativeDriver: true }).start();
      return;
    }
    Animated.timing(fadeOpacity, { toValue: 0, duration: 100, useNativeDriver: true }).start(
      ({ finished }) => {
        if (finished) setShouldRender(false);
      }
    );
  }, [isVisible, fadeOpacity]);
  // Date picker helper functions - use translated month names
  const months = i18n.t('months.array');

  const isDateValid = (
    fromDate: { month: number; year: number } | null,
    toDate: { month: number; year: number } | null
  ) => {
    if (!fromDate || !toDate) return true;

    const from = new Date(fromDate.year, fromDate.month - 1, 1);
    const to = new Date(toDate.year, toDate.month - 1, 1);

    return to >= from;
  };

  const updateDateRange = (type: 'from' | 'to', field: 'month' | 'year', value: number | null) => {
    hapticFeedback.selection();
    const currentDate = dateRange[type] || { month: 1, year: new Date().getFullYear() };

    const updatedDate = {
      ...currentDate,
      [field]: value,
    };

    const newDateRange = {
      ...dateRange,
      [type]: updatedDate,
    };

    // Validate date range - if invalid, don't update
    if (!isDateValid(newDateRange.from, newDateRange.to)) {
      hapticFeedback.error();
      return;
    }

    onDateRangeChange(newDateRange);
  };

  const handleApply = () => {
    hapticFeedback.success();
    // Track library screen clicks for apply button
    track('Library screen clicks', { event: 'Date range apply' });
    onClose();
  };

  const handleReset = () => {
    hapticFeedback.success();
    // Track library screen clicks for reset button
    track('Library screen clicks', { event: 'Date range reset' });
    onReset();
    onClose();
  };

  // Repetition config
  const currentYear = new Date().getFullYear();
  const yearCount = currentYear - 1950 + 1;
  const repeats = 20;
  const middleRepeatIndex = Math.floor(repeats / 2);

  // Repeat months 'repeats' times
  const repeatedMonths = Array.from({ length: repeats }, () => months).flat();

  return (
    <Modal visible={shouldRender} transparent={true} animationType="none" onRequestClose={onClose}>
      <Animated.View style={{ flex: 1, opacity: fadeOpacity }}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
          <TouchableOpacity
            style={styles.popupContainer}
            activeOpacity={1}
            onPress={() => {}} // Prevent closing when clicking inside the modal
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>{title}</Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <X width={20} height={20} color="#000000" />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* From Date Section */}
              <View style={styles.dateSection}>
                <Text style={styles.dateSectionTitle}>{i18n.t('performance.from')}</Text>
                <View style={styles.pickersContainer}>
                  {/* Month Picker */}
                  <View style={styles.pickerSection}>
                    <View style={styles.pickerWrapper}>
                      <Picker
                        selectedValue={
                          dateRange.from?.month
                            ? middleRepeatIndex * 12 + (dateRange.from.month - 1)
                            : undefined
                        }
                        onValueChange={(value) =>
                          updateDateRange('from', 'month', (value % 12) + 1)
                        }
                        style={styles.picker}
                        itemStyle={
                          Platform.OS === 'ios' ? { color: '#000000', fontSize: 14 } : undefined
                        }
                        dropdownIconColor="#000000"
                      >
                        {repeatedMonths.map((month, index) => (
                          <Picker.Item
                            key={`${index}`}
                            label={month}
                            value={index}
                            color="#000000"
                          />
                        ))}
                      </Picker>
                    </View>
                  </View>

                  {/* Year Picker */}
                  <View style={styles.yearPickerSection}>
                    <View style={styles.pickerWrapper}>
                      <Picker
                        selectedValue={
                          dateRange.from?.year
                            ? middleRepeatIndex * yearCount + (dateRange.from.year - 1950)
                            : undefined
                        }
                        onValueChange={(value) => {
                          const adjustedYear = (value % yearCount) + 1950;
                          updateDateRange('from', 'year', adjustedYear);
                        }}
                        style={styles.picker}
                        itemStyle={
                          Platform.OS === 'ios' ? { color: '#000000', fontSize: 14 } : undefined
                        }
                        dropdownIconColor="#000000"
                      >
                        {Array.from(
                          { length: repeats * yearCount },
                          (_, i) => 1950 + (i % yearCount)
                        ).map((yearVal, index) => (
                          <Picker.Item
                            key={`${index}`}
                            label={yearVal.toString()}
                            value={index}
                            color="#000000"
                          />
                        ))}
                      </Picker>
                    </View>
                  </View>
                </View>
              </View>

              {/* To Date Section */}
              <View style={styles.dateSection}>
                <Text style={styles.dateSectionTitle}>{i18n.t('performance.to')}</Text>
                <View style={styles.pickersContainer}>
                  {/* Month Picker */}
                  <View style={styles.pickerSection}>
                    <View style={styles.pickerWrapper}>
                      <Picker
                        selectedValue={
                          dateRange.to?.month
                            ? middleRepeatIndex * 12 + (dateRange.to.month - 1)
                            : undefined
                        }
                        onValueChange={(value) => updateDateRange('to', 'month', (value % 12) + 1)}
                        style={styles.picker}
                        itemStyle={
                          Platform.OS === 'ios' ? { color: '#000000', fontSize: 14 } : undefined
                        }
                        dropdownIconColor="#000000"
                      >
                        {repeatedMonths.map((month, index) => (
                          <Picker.Item
                            key={`${index}`}
                            label={month}
                            value={index}
                            color="#000000"
                          />
                        ))}
                      </Picker>
                    </View>
                  </View>

                  {/* Year Picker */}
                  <View style={styles.yearPickerSection}>
                    <View style={styles.pickerWrapper}>
                      <Picker
                        selectedValue={
                          dateRange.to?.year
                            ? middleRepeatIndex * yearCount + (dateRange.to.year - 1950)
                            : undefined
                        }
                        onValueChange={(value) => {
                          const adjustedYear = (value % yearCount) + 1950;
                          updateDateRange('to', 'year', adjustedYear);
                        }}
                        style={styles.picker}
                        itemStyle={
                          Platform.OS === 'ios' ? { color: '#000000', fontSize: 14 } : undefined
                        }
                        dropdownIconColor="#000000"
                      >
                        {Array.from(
                          { length: repeats * yearCount },
                          (_, i) => 1950 + (i % yearCount)
                        ).map((yearVal, index) => (
                          <Picker.Item
                            key={`${index}`}
                            label={yearVal.toString()}
                            value={index}
                            color="#000000"
                          />
                        ))}
                      </Picker>
                    </View>
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Bottom Buttons */}
            <View style={styles.bottomControls}>
              <View style={styles.buttonStack}>
                <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
                  <Text style={styles.resetButtonText}>{i18n.t('performance.reset')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
                  <Text style={styles.applyButtonText}>{i18n.t('performance.apply')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  popupContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    height: '90%',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    textAlign: 'left',
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    minHeight: 0,
  },
  dateSection: {
    marginBottom: 30,
  },
  dateSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    marginBottom: 20,
    textAlign: 'left',
  },
  pickersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  pickerSection: {
    flex: 1.5, // wider flex for month
    alignItems: 'center',
  },
  yearPickerSection: {
    flex: 1.5, // equal flex for year
    alignItems: 'center',
  },
  pickerWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  picker: {
    height: Platform.OS === 'ios' ? 200 : 80,
    width: '100%',
  },
  bottomControls: {
    justifyContent: 'flex-end',
    width: '100%',
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 16,
  },
  buttonStack: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
  },
  resetButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: 19,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  applyButton: {
    flex: 1,
    backgroundColor: '#000000',
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
});
