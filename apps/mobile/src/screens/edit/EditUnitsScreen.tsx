import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { AnimatedOptionButton } from '../../components/ui/buttons/AnimatedOptionButton';
import { useTheme } from '../../context/ThemeContext';
import { hapticFeedback } from '../../utils/haptic';
import i18n from '../../utils/i18n';

interface EditUnitsScreenProps {
  onBack: () => void;
}

export function EditUnitsScreen({ onBack }: EditUnitsScreenProps) {
  const { colors, colorScheme } = useTheme();
  const [selectedUnit, setSelectedUnit] = useState<'metric' | 'imperial'>('metric');
  const [isSaving, setIsSaving] = useState(false);

  const handleUnitSelect = (unitSystem: 'metric' | 'imperial') => {
    hapticFeedback.selection();
    setSelectedUnit(unitSystem);
  };

  const handleSave = () => {
    if (isSaving) return;
    hapticFeedback.selection();
    setIsSaving(true);
    // UI only - no actual save logic
    setTimeout(() => {
      setIsSaving(false);
      onBack();
    }, 500);
  };

  const backgroundColor = colorScheme === 'dark' ? colors.background : '#FFFFFF';
  const textColor = colorScheme === 'dark' ? colors.text : '#000000';
  const buttonBackground = colorScheme === 'dark' ? colors.surface : '#F0F0F0';
  const selectedButtonBackground = colorScheme === 'dark' ? colors.primary : '#000000';
  const selectedTextColor = colorScheme === 'dark' ? colors.primaryForeground : '#FFFFFF';
  const selectedDescriptionColor = colorScheme === 'dark' ? '#E5E7EB' : '#E5E7EB';
  const unselectedDescriptionColor = colorScheme === 'dark' ? '#9CA3AF' : '#9CA3AF';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={backgroundColor} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: buttonBackground }]}
          onPress={() => {
            hapticFeedback.selection();
            onBack();
          }}
        >
          <ChevronLeft size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>{i18n.t('settings.units')}</Text>
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
              selectedUnit === 'metric'
                ? { backgroundColor: selectedButtonBackground }
                : { backgroundColor: buttonBackground },
            ]}
          >
            <View style={styles.unitContent}>
              <Text
                style={[
                  styles.unitName,
                  selectedUnit === 'metric' ? { color: selectedTextColor } : { color: textColor },
                ]}
              >
                {i18n.t('onboarding.units.metric')}
              </Text>
              <Text
                style={[
                  styles.unitDescription,
                  selectedUnit === 'metric'
                    ? { color: selectedDescriptionColor }
                    : { color: unselectedDescriptionColor },
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
              selectedUnit === 'imperial'
                ? { backgroundColor: selectedButtonBackground }
                : { backgroundColor: buttonBackground },
            ]}
          >
            <View style={styles.unitContent}>
              <Text
                style={[
                  styles.unitName,
                  selectedUnit === 'imperial' ? { color: selectedTextColor } : { color: textColor },
                ]}
              >
                {i18n.t('onboarding.units.imperial')}
              </Text>
              <Text
                style={[
                  styles.unitDescription,
                  selectedUnit === 'imperial'
                    ? { color: selectedDescriptionColor }
                    : { color: unselectedDescriptionColor },
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
          style={[
            styles.saveButton,
            { backgroundColor: selectedButtonBackground },
            isSaving && { opacity: 0.7 },
          ]}
          onPress={handleSave}
          activeOpacity={0.7}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color={selectedTextColor} />
          ) : (
            <Text style={[styles.saveButtonText, { color: selectedTextColor }]}>
              {i18n.t('settings.save')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
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
    borderRadius: 18,
    paddingHorizontal: 24,
    paddingVertical: 16,
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
  unitDescription: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  saveButtonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  saveButton: {
    borderRadius: 28,
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
});

