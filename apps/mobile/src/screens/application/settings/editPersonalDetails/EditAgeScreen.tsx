import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import i18n from '../../../../utils/i18n';
import { hapticFeedback } from '../../../../utils/haptic';
import { useUserDetails } from '../../../../context/UserDetailsContext';
import { editUserDetails } from '../../../../services/userService';
import { ChevronLeft } from 'lucide-react-native';
import { track } from '../../../../services/analytics';
import { AnimatedOptionButton } from '../../../../components/ui/buttons/AnimatedOptionButton';
import { showAlert } from '../../../../services/alertService';

interface EditAgeScreenProps {
  onBack: () => void;
  currentValue: string;
  onSave: (newValue: string) => void;
}

export function EditAgeScreen({ onBack, currentValue, onSave }: EditAgeScreenProps) {
  const { updateUserDetails, refetchUserDetails } = useUserDetails();
  const [isSaving, setIsSaving] = useState(false);
  const [selectedAgeRange, setSelectedAgeRange] = useState<string>('25-34'); // Default age range

  // Track screen view on mount
  useEffect(() => {
    track('Screen viewed', { screen_name: 'Edit Age' });
  }, []);

  // Parse current value to determine initial age range
  React.useEffect(() => {
    if (currentValue) {
      // If currentValue is already an age range, use it
      const ageRanges = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
      if (ageRanges.includes(currentValue)) {
        setSelectedAgeRange(currentValue);
        return;
      }

      // If it's a date, calculate age and determine range
      const age = calculateAgeFromDate(currentValue);
      if (age !== null) {
        const ageRange = getAgeRangeFromAge(age);
        setSelectedAgeRange(ageRange);
      }
    }
  }, [currentValue]);

  const calculateAgeFromDate = (dateString: string): number | null => {
    try {
      let date: Date;

      // Try different date formats
      if (dateString.includes('-')) {
        // YYYY-MM-DD or DD-MM-YYYY format
        const parts = dateString.split('-');
        if (parts[0].length === 4) {
          // YYYY-MM-DD
          date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        } else {
          // DD-MM-YYYY
          date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
      } else if (dateString.includes('/')) {
        // DD/MM/YYYY format
        const parts = dateString.split('/');
        date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      } else {
        return null;
      }

      const today = new Date();
      let age = today.getFullYear() - date.getFullYear();
      const monthDiff = today.getMonth() - date.getMonth();

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
        age--;
      }

      return age;
    } catch (error) {
      return null;
    }
  };

  const getAgeRangeFromAge = (age: number): string => {
    if (age >= 18 && age <= 24) return '18-24';
    if (age >= 25 && age <= 34) return '25-34';
    if (age >= 35 && age <= 44) return '35-44';
    if (age >= 45 && age <= 54) return '45-54';
    if (age >= 55 && age <= 64) return '55-64';
    return '65+';
  };

  const ageRanges = [
    { value: '18-24', label: i18n.t('onboarding.ageRange.ageRanges.18-24') },
    { value: '25-34', label: i18n.t('onboarding.ageRange.ageRanges.25-34') },
    { value: '35-44', label: i18n.t('onboarding.ageRange.ageRanges.35-44') },
    { value: '45-54', label: i18n.t('onboarding.ageRange.ageRanges.45-54') },
    { value: '55-64', label: i18n.t('onboarding.ageRange.ageRanges.55-64') },
    { value: '65+', label: i18n.t('onboarding.ageRange.ageRanges.65+') },
  ];

  const handleAgeRangeSelect = (ageRange: string) => {
    hapticFeedback.selection();
    setSelectedAgeRange(ageRange);
  };

  const handleSave = async () => {
    if (isSaving) return;
    hapticFeedback.selection();
    // Track library screen clicks for save
    track('Library screen clicks', { event: 'Save new age range' });
    setIsSaving(true);

    try {
      // Save the age range to the age_range field
      await editUserDetails({ age_range: selectedAgeRange });
      updateUserDetails('ageRange', selectedAgeRange);
      await refetchUserDetails();
      hapticFeedback.success();
      onSave(selectedAgeRange);
    } catch (e) {
      hapticFeedback.error();
      showAlert(
        i18n.t('settings.editFailed.age'),
        i18n.t('settings.editFailed.message'),
        () => {
          hapticFeedback.selection();
          onBack();
        },
        'EDIT_AGE_FAILED'
      );
    }
    setIsSaving(false);
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
        <Text style={styles.headerTitle}>{i18n.t('personalDetails.editAgeTitle')}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.ageRangesContainer}>
          {ageRanges.map((ageRange, index) => (
            <AnimatedOptionButton
              key={ageRange.value}
              onPress={() => handleAgeRangeSelect(ageRange.value)}
              isSelected={selectedAgeRange === ageRange.value}
              delay={index * 100}
              style={[
                styles.ageRangeButton,
                selectedAgeRange === ageRange.value
                  ? styles.selectedAgeRangeButton
                  : styles.unselectedAgeRangeButton,
              ]}
            >
              <Text
                style={[
                  styles.ageRangeText,
                  selectedAgeRange === ageRange.value
                    ? styles.selectedAgeRangeText
                    : styles.unselectedAgeRangeText,
                  {
                    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
                  },
                ]}
              >
                {ageRange.label}
              </Text>
            </AnimatedOptionButton>
          ))}
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
  ageRangesContainer: {
    width: '100%',
    gap: 12,
  },
  ageRangeButton: {
    minHeight: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedAgeRangeButton: {
    backgroundColor: '#000000',
  },
  unselectedAgeRangeButton: {
    backgroundColor: '#F0F0F0',
  },
  ageRangeText: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  selectedAgeRangeText: {
    color: '#FFFFFF',
  },
  unselectedAgeRangeText: {
    color: '#000000',
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
