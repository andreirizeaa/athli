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
import { useUserDetails } from '../../../../context/UserDetailsContext';
import { editUserDetails } from '../../../../services/userService';
import { hapticFeedback } from '../../../../utils/haptic';
import i18n from '../../../../utils/i18n';
import { ChevronLeft } from 'lucide-react-native';
import { AnimatedOptionButton } from '../../../../components/ui/buttons/AnimatedOptionButton';
import { showAlert } from '../../../../services/alertService';
import { track } from '../../../../services/analytics';

interface EditGenderScreenProps {
  onBack: () => void;
  currentValue: string;
  onSave: (newValue: string) => void;
}

export function EditGenderScreen({ onBack, currentValue, onSave }: EditGenderScreenProps) {
  const { refetchUserDetails } = useUserDetails();
  const [selectedGender, setSelectedGender] = useState(currentValue);
  const [isSaving, setIsSaving] = useState(false);

  // Track screen view on mount
  useEffect(() => {
    track('Screen viewed', { screen_name: 'Edit Gender' });
  }, []);

  const handleNext = async () => {
    if (isSaving) return;
    hapticFeedback.selection();
    // Track library screen clicks for save
    track('Library screen clicks', { event: 'Save new gender' });
    setIsSaving(true);
    try {
      await editUserDetails({ gender: selectedGender });
      await refetchUserDetails();
      hapticFeedback.success();
      onSave(selectedGender);
    } catch (e) {
      hapticFeedback.error();
      setSelectedGender(currentValue);
      showAlert(
        i18n.t('settings.editFailed.gender'),
        i18n.t('settings.editFailed.message'),
        () => {
          hapticFeedback.selection();
          onBack();
        },
        'Gender edit failed'
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
        <Text style={styles.headerTitle}>{i18n.t('personalDetails.editGender')}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Title */}
        <Text style={styles.title}>{i18n.t('onboarding.gender.title')}</Text>

        {/* Gender Selection Buttons */}
        <View style={styles.optionsContainer}>
          <AnimatedOptionButton
            isSelected={selectedGender === 'male'}
            delay={0}
            style={[
              styles.genderButton,
              selectedGender === 'male'
                ? styles.selectedGenderButton
                : styles.unselectedGenderButton,
            ]}
            onPress={() => {
              hapticFeedback.selection();
              setSelectedGender('male');
            }}
          >
            <Text
              style={[
                styles.optionText,
                selectedGender === 'male' ? styles.selectedOptionText : styles.unselectedOptionText,
              ]}
            >
              {i18n.t('onboarding.gender.male')}
            </Text>
          </AnimatedOptionButton>

          <AnimatedOptionButton
            isSelected={selectedGender === 'female'}
            delay={100}
            style={[
              styles.genderButton,
              selectedGender === 'female'
                ? styles.selectedGenderButton
                : styles.unselectedGenderButton,
            ]}
            onPress={() => {
              hapticFeedback.selection();
              setSelectedGender('female');
            }}
          >
            <Text
              style={[
                styles.optionText,
                selectedGender === 'female'
                  ? styles.selectedOptionText
                  : styles.unselectedOptionText,
              ]}
            >
              {i18n.t('onboarding.gender.female')}
            </Text>
          </AnimatedOptionButton>
        </View>
      </View>

      {/* Next Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.nextButton, isSaving && { opacity: 0.7 }]}
          onPress={handleNext}
          activeOpacity={0.8}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.nextButtonText}>{i18n.t('settings.save')}</Text>
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
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    textAlign: 'center',
    marginBottom: 32,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  optionsContainer: {
    gap: 16,
  },
  optionText: {
    fontSize: 18,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    textAlign: 'center',
  },
  selectedOptionText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  unselectedOptionText: {
    color: '#000000',
    fontWeight: '800',
  },
  genderButton: {
    // Base styles for gender buttons
  },
  selectedGenderButton: {
    backgroundColor: '#000000',
  },
  unselectedGenderButton: {
    backgroundColor: '#F0F0F0',
  },
  bottomContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  nextButton: {
    backgroundColor: '#000000',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 28,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
});
