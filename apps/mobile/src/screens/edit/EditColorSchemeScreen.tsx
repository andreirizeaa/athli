import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { AnimatedOptionButton } from '../../components/ui/buttons/AnimatedOptionButton';
import { THEMES, PresetValue } from '../../theme/theme';
import { useTheme } from '../../context/ThemeContext';
import { hapticFeedback } from '../../utils/haptic';
import i18n from '../../utils/i18n';

interface EditColorSchemeScreenProps {
  onBack: () => void;
}

export function EditColorSchemeScreen({ onBack }: EditColorSchemeScreenProps) {
  const { colors, colorScheme, theme, setPreset } = useTheme();
  const originalPreset = useRef<PresetValue>(theme.preset);
  const hasSaved = useRef<boolean>(false);
  const [selectedPreset, setSelectedPreset] = useState<PresetValue>(theme.preset);
  const [isSaving, setIsSaving] = useState(false);

  // Revert to original preset if user leaves without saving
  useEffect(() => {
    return () => {
      if (!hasSaved.current && selectedPreset !== originalPreset.current) {
        setPreset(originalPreset.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePresetSelect = (preset: string) => {
    hapticFeedback.selection();
    const newPreset = preset as PresetValue;
    setSelectedPreset(newPreset);
    // Apply preset immediately when selected
    setPreset(newPreset);
  };

  const handleSave = () => {
    if (isSaving) return;
    hapticFeedback.selection();
    setIsSaving(true);
    // Mark as saved so cleanup doesn't revert
    hasSaved.current = true;
    // Update original preset to current selection so it persists
    originalPreset.current = selectedPreset;
    // UI only - no actual save logic
    setTimeout(() => {
      setIsSaving(false);
      onBack();
    }, 500);
  };

  const handleBack = () => {
    // Revert to original preset before going back if not saved
    if (!hasSaved.current && selectedPreset !== originalPreset.current) {
      setPreset(originalPreset.current);
    }
    onBack();
  };

  const backgroundColor = colorScheme === 'dark' ? colors.background : '#FFFFFF';
  const textColor = colorScheme === 'dark' ? colors.text : '#000000';
  const buttonBackground = colorScheme === 'dark' ? colors.surface : '#F0F0F0';
  const selectedButtonBackground = colorScheme === 'dark' ? colors.primary : '#000000';
  const selectedTextColor = colorScheme === 'dark' ? colors.primaryForeground : '#FFFFFF';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={backgroundColor} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: buttonBackground }]}
          onPress={() => {
            hapticFeedback.selection();
            handleBack();
          }}
        >
          <ChevronLeft size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>{i18n.t('settings.colorScheme')}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator
        persistentScrollbar
        scrollIndicatorInsets={{ right: 1 }}
        indicatorStyle={colorScheme === 'dark' ? 'white' : 'black'}
        bounces
        alwaysBounceVertical={false}
        nestedScrollEnabled
      >
        {/* Color Scheme Options */}
        <View style={styles.optionsContainer}>
          {THEMES.map((themeOption, index) => {
            const isSelected = selectedPreset === themeOption.value;
            const themeColor = themeOption.colors[0] || '#000000';

            return (
              <AnimatedOptionButton
                key={themeOption.value}
                isSelected={isSelected}
                delay={index * 50}
                onPress={() => handlePresetSelect(themeOption.value)}
                disabled={isSaving}
                style={[
                  styles.colorSchemeButton,
                  isSelected
                    ? { backgroundColor: selectedButtonBackground }
                    : { backgroundColor: buttonBackground },
                  ...(isSaving ? [styles.disabledColorSchemeButton] : []),
                ]}
              >
                <View style={styles.colorSchemeContent}>
                  <Text
                    style={[
                      styles.colorSchemeName,
                      isSelected ? { color: selectedTextColor } : { color: textColor },
                    ]}
                  >
                    {themeOption.name}
                  </Text>
                  <View
                    style={[
                      styles.colorCircle,
                      { backgroundColor: themeColor },
                      ...(isSelected ? [styles.selectedColorCircle] : []),
                    ]}
                  />
                </View>
              </AnimatedOptionButton>
            );
          })}
        </View>
      </ScrollView>

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
  scrollView: {
    flexGrow: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    gap: 12,
  },
  optionsContainer: {
    gap: 16,
  },
  colorSchemeButton: {
    borderRadius: 18,
    paddingHorizontal: 24,
    paddingVertical: 16,
    justifyContent: 'center',
  },
  disabledColorSchemeButton: {
    opacity: 0.5,
  },
  colorSchemeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  colorSchemeName: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  colorCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColorCircle: {
    borderColor: '#FFFFFF',
  },
  saveButtonContainer: {
    marginTop: 16,
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

