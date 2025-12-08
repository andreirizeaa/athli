import React, { useState } from 'react';
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
import { LANGUAGES } from '../../constants/languages';
import { useTheme } from '../../context/ThemeContext';
import { hapticFeedback } from '../../utils/haptic';
import i18n from '../../utils/i18n';

interface EditLanguageScreenProps {
  onBack: () => void;
}

export function EditLanguageScreen({ onBack }: EditLanguageScreenProps) {
  const { colors, colorScheme } = useTheme();
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [isSaving, setIsSaving] = useState(false);

  const handleLanguageSelect = (languageCode: string) => {
    hapticFeedback.selection();
    setSelectedLanguage(languageCode);
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
          <ChevronLeft size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>{i18n.t('settings.language')}</Text>
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
        {/* Language Options */}
        <View style={styles.optionsContainer}>
          {LANGUAGES.map((language, index) => {
            const isSelected = selectedLanguage === language.code;

            return (
              <AnimatedOptionButton
                key={language.code}
                isSelected={isSelected}
                delay={index * 50}
                onPress={() => handleLanguageSelect(language.code)}
                disabled={isSaving}
                style={[
                  styles.languageButton,
                  isSelected
                    ? { backgroundColor: selectedButtonBackground }
                    : { backgroundColor: buttonBackground },
                  isSaving && styles.disabledLanguageButton,
                ]}
              >
                <View style={styles.languageContent}>
                  <Text
                    style={[
                      styles.languageName,
                      isSelected ? { color: selectedTextColor } : { color: textColor },
                    ]}
                  >
                    {language.nativeName}
                  </Text>
                  <Text style={styles.flag}>{language.flag}</Text>
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
  languageButton: {
    borderRadius: 18,
    paddingHorizontal: 24,
    paddingVertical: 16,
    justifyContent: 'center',
  },
  disabledLanguageButton: {
    opacity: 0.5,
  },
  languageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  languageName: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  flag: {
    fontSize: 24,
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

