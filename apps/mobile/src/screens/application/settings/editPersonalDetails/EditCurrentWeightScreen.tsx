import React, { useState, useRef, useEffect, useMemo } from 'react';
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
import { editUserDetails } from '../../../../services/userService';
import {
  parseWeightToMetric,
  convertMetricWeightToImperial,
  convertImperialWeightToMetric,
} from '../../../../utils/unitConversions';
import { ChevronLeft } from 'lucide-react-native';
import { track } from '../../../../services/analytics';
import { showAlert } from '../../../../services/alertService';

interface EditCurrentWeightScreenProps {
  onBack: () => void;
  currentValue: string;
  onSave: (newValue: string) => void;
}

export function EditCurrentWeightScreen({
  onBack,
  currentValue,
  onSave,
}: EditCurrentWeightScreenProps) {
  const { userDetails, refetchUserDetails } = useUserDetails();
  const unitSystem = userDetails?.unitSystem ?? 'metric';
  const isMetric = unitSystem === 'metric';
  const [selectedWeight, setSelectedWeight] = useState(60);
  const [isSaving, setIsSaving] = useState(false);
  const didMount = useRef(false);

  // Track screen view on mount
  useEffect(() => {
    track('Screen viewed', { screen_name: 'Edit Current Weight' });
  }, []);

  // Generate weight options similar to onboarding
  const weightOptions = useMemo(() => {
    if (isMetric) {
      // 40kg to 250kg in 0.1kg increments (2101 options)
      return Array.from({ length: 2101 }, (_, i) => Number((40 + i * 0.1).toFixed(1)));
    } else {
      // 88lbs to 550lbs in 0.1lb increments (4621 options) - equivalent to 40-250kg
      return Array.from({ length: 4621 }, (_, i) => Number((88 + i * 0.1).toFixed(1)));
    }
  }, [isMetric]);

  const repeats = 3; // Number of repeats for infinite scroll effect
  const middleRepeatIndex = 1; // Use middle repeat for initial selection

  // Set didMount after first render
  useEffect(() => {
    didMount.current = true;
  }, []);

  // Update initial state when currentValue or unit system changes
  useEffect(() => {
    if (!currentValue) return;

    const weightKg = parseWeightToMetric(currentValue);
    const imperialWeight = convertMetricWeightToImperial(weightKg);

    // Always round to 1 decimal place for both metric and imperial
    const initialValue = Number((isMetric ? weightKg : imperialWeight).toFixed(1));
    setSelectedWeight(initialValue);

    // IMPORTANT: reset didMount so that onValueChange doesn't fire right away
    didMount.current = false;

    // Re-enable updates after a tick
    const timer = setTimeout(() => {
      didMount.current = true;
    }, 0);

    return () => clearTimeout(timer);
  }, [currentValue, isMetric]);

  const handleWeightChange = (value: number) => {
    if (!didMount.current) return;

    const len = weightOptions.length;
    const optionIndex = value % len;
    const selected = weightOptions[optionIndex];
    setSelectedWeight(selected);
  };

  const handleSave = async () => {
    if (isSaving) return;
    hapticFeedback.selection();
    // Track library screen clicks for save
    track('Library screen clicks', { event: 'Save new weight' });
    setIsSaving(true);

    const weightKg = isMetric ? selectedWeight : convertImperialWeightToMetric(selectedWeight);

    try {
      await editUserDetails({ weight: weightKg });
      await refetchUserDetails();
      hapticFeedback.success();

      const unit = isMetric ? 'kg' : 'lbs';
      // Always show 1 decimal place for both metric and imperial
      const displayValue = `${Number(selectedWeight.toFixed(1))} ${unit}`;

      onSave(displayValue);
    } catch (e) {
      hapticFeedback.error();
      showAlert(
        i18n.t('settings.editFailed.currentWeight'),
        i18n.t('settings.editFailed.message'),
        () => {
          hapticFeedback.selection();
        },
        'Current weight edit failed'
      );
    } finally {
      setIsSaving(false);
    }
  };

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
        <Text style={styles.headerTitle}>{i18n.t('personalDetails.editCurrentWeight')}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>{i18n.t('personalDetails.weight')}</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={(() => {
                const base = isMetric ? 40 : 88;
                const len = weightOptions.length;
                const idx = Math.max(
                  0,
                  Math.min(len - 1, Math.round((selectedWeight - base) * 10))
                );
                return middleRepeatIndex * len + idx;
              })()}
              onValueChange={handleWeightChange}
              style={[styles.picker, { color: '#000000' }]}
              itemStyle={Platform.OS === 'ios' ? { color: '#000000', fontSize: 16 } : undefined}
              dropdownIconColor="#000000"
            >
              {Array.from(
                { length: repeats * weightOptions.length },
                (_, i) => weightOptions[i % weightOptions.length]
              ).map((weight, index) => (
                <Picker.Item
                  key={`w-${index}`}
                  label={`${weight.toFixed(1)} ${isMetric ? 'kg' : 'lbs'}`}
                  value={index}
                  color="#000000"
                />
              ))}
            </Picker>
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
  },
  pickerContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerLabel: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 20,
    color: '#000000',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  pickerWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  picker: {
    height: Platform.OS === 'ios' ? 280 : 80,
    width: '100%',
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
