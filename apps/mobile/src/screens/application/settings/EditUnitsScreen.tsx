import React, { useEffect } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import i18n from '../../../utils/i18n';
import { hapticFeedback } from '../../../utils/haptic';
import { useUserDetails } from '../../../context/UserDetailsContext';
import { editUserDetails } from '../../../services/userService';
import { ChevronLeft } from 'lucide-react-native';
import { AnimatedOptionButton } from '../../../components/ui/buttons/AnimatedOptionButton';
import { track } from '../../../services/analytics';
import { showAlert } from '../../../services/alertService';

interface EditUnitsScreenProps {
  onBack: () => void;
}

export function EditUnitsScreen({ onBack }: EditUnitsScreenProps) {
  const { userDetails } = useUserDetails();
  const [selectedUnit, setSelectedUnit] = React.useState(userDetails?.unitSystem ?? 'metric');
  const [isSaving, setIsSaving] = React.useState(false);
  const { updateUnitSystem } = useUserDetails();

  // Track screen view on mount
  useEffect(() => {
    track('Screen viewed', { screen_name: 'Edit Units' });
  }, []);

  const handleUnitSelect = (unitSystem: 'metric' | 'imperial') => {
    hapticFeedback.selection();
    setSelectedUnit(unitSystem);
  };

  const handleSave = async () => {
    if (isSaving) return;
    hapticFeedback.selection();
    // Track library screen clicks for save
    track('Library screen clicks', { event: 'Save new units' });
    setIsSaving(true);
    try {
      const unit = (selectedUnit as 'metric' | 'imperial') ?? 'metric';
      await editUserDetails({ unit_system: unit });
      hapticFeedback.success();
      updateUnitSystem(unit);
      onBack();
    } catch (e) {
      hapticFeedback.error();
      setSelectedUnit(userDetails?.unitSystem ?? 'metric');
      showAlert(
        i18n.t('settings.editFailed.unitSystem'),
        i18n.t('settings.editFailed.message'),
        () => {
          hapticFeedback.selection();
          onBack();
        },
        'Units edit failed'
      );
    }
    setIsSaving(false);
  };

  return (
    <SafeAreaView style={styles.container}>
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
          <ChevronLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{i18n.t('settings.units')}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Units Options */}
        <View style={styles.optionsContainer}>
          <AnimatedOptionButton
            isSelected={selectedUnit === 'metric'}
            delay={0}
            onPress={() => handleUnitSelect('metric')}
            style={[
              styles.unitButton,
              selectedUnit === 'metric' ? styles.selectedUnitButton : styles.unselectedUnitButton,
            ]}
          >
            <View style={styles.unitContent}>
              <Text
                style={[
                  styles.unitName,
                  selectedUnit === 'metric' ? styles.selectedUnitName : styles.unselectedUnitName,
                ]}
              >
                {i18n.t('onboarding.units.metric')}
              </Text>
              <Text
                style={[
                  styles.unitDescription,
                  selectedUnit === 'metric'
                    ? styles.selectedUnitDescription
                    : styles.unselectedUnitDescription,
                ]}
              >
                {i18n.t('onboarding.units.metricDescription')}
              </Text>
            </View>
          </AnimatedOptionButton>

          <AnimatedOptionButton
            isSelected={selectedUnit === 'imperial'}
            delay={100}
            onPress={() => handleUnitSelect('imperial')}
            style={[
              styles.unitButton,
              selectedUnit === 'imperial' ? styles.selectedUnitButton : styles.unselectedUnitButton,
            ]}
          >
            <View style={styles.unitContent}>
              <Text
                style={[
                  styles.unitName,
                  selectedUnit === 'imperial' ? styles.selectedUnitName : styles.unselectedUnitName,
                ]}
              >
                {i18n.t('onboarding.units.imperial')}
              </Text>
              <Text
                style={[
                  styles.unitDescription,
                  selectedUnit === 'imperial'
                    ? styles.selectedUnitDescription
                    : styles.unselectedUnitDescription,
                ]}
              >
                {i18n.t('onboarding.units.imperialDescription')}
              </Text>
            </View>
          </AnimatedOptionButton>
        </View>
      </View>

      {/* Save Button - Stuck to bottom */}
      <View style={styles.saveButtonContainer}>
        <TouchableOpacity
          style={[styles.saveButton, isSaving && { opacity: 0.7 }]}
          onPress={handleSave}
          activeOpacity={0.7}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>{i18n.t('settings.save')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
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
    paddingHorizontal: 20,
    paddingTop: 10,
    justifyContent: 'center',
  },
  optionsContainer: {
    gap: 16,
  },
  unitButton: {
    minHeight: 80,
    justifyContent: 'center',
  },
  selectedUnitButton: {
    backgroundColor: '#000000',
  },
  unselectedUnitButton: {
    backgroundColor: '#F0F0F0',
  },
  unitContent: {
    alignItems: 'center',
  },
  unitName: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  selectedUnitName: {
    color: '#FFFFFF',
  },
  unselectedUnitName: {
    color: '#000000',
  },
  unitDescription: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  selectedUnitDescription: {
    color: '#E5E7EB',
  },
  unselectedUnitDescription: {
    color: '#9CA3AF',
  },
  saveButtonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  saveButton: {
    backgroundColor: '#000000',
    borderRadius: 28,
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
});
