import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import i18n from '../../../../utils/i18n';
import { hapticFeedback } from '../../../../utils/haptic';
import { useUserDetails } from '../../../../context/UserDetailsContext';
import {
  parseHeightToMetric,
  convertMetricHeightToImperial,
  convertImperialHeightToMetric,
} from '../../../../utils/unitConversions';
import { editUserDetails } from '../../../../services/userService';
import { ChevronLeft } from 'lucide-react-native';
import { track } from '../../../../services/analytics';
import { showAlert } from '../../../../services/alertService';

interface EditHeightScreenProps {
  onBack: () => void;
  currentValue: string;
  onSave: (newValue: string) => void;
}

export function EditHeightScreen({ onBack, currentValue, onSave }: EditHeightScreenProps) {
  const { userDetails, updateHeight, refetchUserDetails } = useUserDetails();
  const unitSystem = userDetails?.unitSystem ?? 'metric';
  const isMetric = unitSystem === 'metric';
  const [selectedHeight, setSelectedHeight] = useState(170); // Default 170cm
  const [selectedFeet, setSelectedFeet] = useState(5); // Default 5 feet
  const [selectedInches, setSelectedInches] = useState(7); // Default 7 inches
  const [isSaving, setIsSaving] = useState(false);

  // Track screen view on mount
  useEffect(() => {
    track('Screen viewed', { screen_name: 'Edit Height' });
  }, []);

  // Parse current value to determine initial state
  React.useEffect(() => {
    updateValues();
  }, [currentValue, isMetric]);

  const updateValues = () => {
    if (currentValue) {
      // Parse the current height string to get the metric value
      const heightCm = parseHeightToMetric(currentValue);

      if (isMetric) {
        setSelectedHeight(heightCm);
      } else {
        // Convert to feet/inches for imperial display
        const { feet, inches } = convertMetricHeightToImperial(heightCm);
        setSelectedFeet(feet);
        setSelectedInches(inches);
      }
    }
  };

  const handleHeightChange = (height: number) => {
    setSelectedHeight(height);
  };

  const handleFeetChange = (feet: number) => {
    setSelectedFeet(feet);
  };

  const handleInchesChange = (inches: number) => {
    setSelectedInches(inches);
  };

  const handleSave = async () => {
    if (isSaving) return;
    hapticFeedback.selection();
    // Track library screen clicks for save
    track('Library screen clicks', { event: 'Save new height' });
    setIsSaving(true);

    let heightCm: number;
    let displayValue: string;

    if (isMetric) {
      heightCm = selectedHeight;
      displayValue = `${Math.round(heightCm)} ${i18n.t('onboarding.measurements.cm')}`;
    } else {
      // Convert feet/inches to cm for storage
      heightCm = convertImperialHeightToMetric(selectedFeet, selectedInches);
      displayValue = `${selectedFeet}' ${selectedInches}"`;
    }

    try {
      await editUserDetails({ height: heightCm });
      await refetchUserDetails();
      hapticFeedback.success();
      onSave(displayValue);
    } catch (e) {
      hapticFeedback.error();
      updateValues();
      showAlert(
        i18n.t('settings.editFailed.height'),
        i18n.t('settings.editFailed.message'),
        () => {
          hapticFeedback.selection();
          onBack();
        },
        'Height edit failed'
      );
    }

    setIsSaving(false);
  };

  // Generate height options
  const heightOptions = Array.from({ length: 151 }, (_, i) => 100 + i); // 100-250 cm
  const feetOptions = Array.from({ length: 8 }, (_, i) => 1 + i); // 1-8 feet
  const inchesOptions = Array.from({ length: 12 }, (_, i) => i); // 0-11 inches
  const repeats = 20;
  const middleRepeatIndex = Math.floor(repeats / 2);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            hapticFeedback.selection();
            onBack();
          }}
        >
          <ChevronLeft width={24} height={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{i18n.t('personalDetails.editHeight')}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Height Picker */}
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>{i18n.t('onboarding.measurements.height')}</Text>
          <View style={styles.pickerWrapper}>
            {isMetric ? (
              // Single picker for metric with repeats
              <Picker
                selectedValue={(() => {
                  const base = 100;
                  const len = heightOptions.length;
                  const idx = Math.max(0, Math.min(len - 1, selectedHeight - base));
                  return middleRepeatIndex * len + idx;
                })()}
                onValueChange={(value) => {
                  const len = heightOptions.length;
                  const idx = Number(value) % len;
                  const cm = heightOptions[idx];
                  handleHeightChange(cm);
                }}
                style={styles.picker}
                itemStyle={Platform.OS === 'ios' ? { fontSize: 16 } : undefined}
              >
                {Array.from(
                  { length: repeats * heightOptions.length },
                  (_, i) => heightOptions[i % heightOptions.length]
                ).map((height, index) => (
                  <Picker.Item
                    key={`h-${index}`}
                    label={`${height} ${i18n.t('onboarding.measurements.cm')}`}
                    value={index}
                  />
                ))}
              </Picker>
            ) : (
              // Two pickers for imperial
              <View style={styles.imperialPickersContainer}>
                <View style={styles.imperialPickerWrapper}>
                  <Picker
                    selectedValue={(() => {
                      const base = 1;
                      const len = feetOptions.length;
                      const idx = Math.max(0, Math.min(len - 1, selectedFeet - base));
                      return middleRepeatIndex * len + idx;
                    })()}
                    onValueChange={(value) => {
                      const len = feetOptions.length;
                      const idx = Number(value) % len;
                      handleFeetChange(feetOptions[idx]);
                    }}
                    style={styles.imperialPicker}
                    itemStyle={Platform.OS === 'ios' ? { fontSize: 16 } : undefined}
                  >
                    {Array.from(
                      { length: repeats * feetOptions.length },
                      (_, i) => feetOptions[i % feetOptions.length]
                    ).map((feet, index) => (
                      <Picker.Item key={`f-${index}`} label={`${feet} ft`} value={index} />
                    ))}
                  </Picker>
                </View>
                <View style={styles.imperialPickerWrapper}>
                  <Picker
                    selectedValue={(() => {
                      const base = 0;
                      const len = inchesOptions.length;
                      const idx = Math.max(0, Math.min(len - 1, selectedInches - base));
                      return middleRepeatIndex * len + idx;
                    })()}
                    onValueChange={(value) => {
                      const len = inchesOptions.length;
                      const idx = Number(value) % len;
                      handleInchesChange(inchesOptions[idx]);
                    }}
                    style={styles.imperialPicker}
                    itemStyle={Platform.OS === 'ios' ? { fontSize: 16 } : undefined}
                  >
                    {Array.from(
                      { length: repeats * inchesOptions.length },
                      (_, i) => inchesOptions[i % inchesOptions.length]
                    ).map((inches, index) => (
                      <Picker.Item key={`i-${index}`} label={`${inches} in`} value={index} />
                    ))}
                  </Picker>
                </View>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Save Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.saveButton, isSaving && { opacity: 0.7 }]}
          onPress={handleSave}
          activeOpacity={0.8}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>{i18n.t('settings.save')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 60, // Account for status bar
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  placeholder: {
    width: 44,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 40,
  },
  pickerContainer: {
    alignItems: 'center',
    width: '100%',
  },
  pickerLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    marginBottom: 20,
    textAlign: 'center',
  },
  pickerWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  picker: {
    height: Platform.OS === 'ios' ? 280 : 80,
    width: '100%',
  },
  imperialPickersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    gap: 30,
  },
  imperialPickerWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  imperialPickerLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    marginBottom: 15,
  },
  imperialPicker: {
    height: Platform.OS === 'ios' ? 280 : 80,
    width: 120,
    minWidth: 80,
  },
  bottomContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  saveButton: {
    backgroundColor: '#000000',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 28,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
});
