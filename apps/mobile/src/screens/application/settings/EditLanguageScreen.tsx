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
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import i18n from '../../../utils/i18n';
import { hapticFeedback } from '../../../utils/haptic';
import { useLanguage } from '../../../context/LanguageContext';
import { useUserDetails } from '../../../context/UserDetailsContext';
import { editUserDetails } from '../../../services/userService';
import { ChevronLeft } from 'lucide-react-native';
import { AnimatedOptionButton } from '../../../components/ui/buttons/AnimatedOptionButton';
import { track } from '../../../services/analytics';
import { LANGUAGES } from '../../../constants/languages';
import { showAlert } from '../../../services/alertService';

interface EditLanguageScreenProps {
  onBack: () => void;
}

export function EditLanguageScreen({ onBack }: EditLanguageScreenProps) {
  const { currentLanguage, setLanguage } = useLanguage();
  const { userDetails, isUserDetailsLoaded, refetchUserDetails } = useUserDetails();
  const [selectedLanguage, setSelectedLanguage] = useState(currentLanguage);

  const [isSaving, setIsSaving] = useState(false);

  // Update selectedLanguage when language data changes (but not during save)
  useEffect(() => {
    // Don't update selected language while saving to prevent UI flickering
    if (isSaving) return;

    // Priority: userDetails.language > currentLanguage from context
    if (userDetails?.language) {
      setSelectedLanguage(userDetails.language);
    } else if (isUserDetailsLoaded) {
      // If user details are loaded but no language is set, use current language
      setSelectedLanguage(currentLanguage);
    }
  }, [userDetails?.language, currentLanguage, isUserDetailsLoaded, isSaving]);

  // Track screen view on mount
  useEffect(() => {
    track('Screen viewed', { screen_name: 'Edit Language' });
  }, []);

  const handleLanguageSelect = (languageCode: string) => {
    hapticFeedback.selection();
    setSelectedLanguage(languageCode);
  };

  const handleSave = async () => {
    if (isSaving) return;
    hapticFeedback.selection();
    // Track library screen clicks for save
    track('Library screen clicks', { event: 'Save new language' });
    setIsSaving(true);

    try {
      // Store the previous language to restore on error
      const previousLanguage = currentLanguage;
      const previousSelectedLanguage = selectedLanguage;

      // Immediately update UI to show new selection
      setLanguage(selectedLanguage);

      await editUserDetails({ language: selectedLanguage });
      await refetchUserDetails();
      hapticFeedback.success();
      onBack();
    } catch (e) {
      // Restore previous language and selected language on error
      setLanguage(currentLanguage);
      setSelectedLanguage(currentLanguage);
      hapticFeedback.error();
      showAlert(
        i18n.t('settings.editFailed.language'),
        i18n.t('settings.editFailed.message'),
        () => {
          hapticFeedback.selection();
          onBack();
        },
        'Language edit failed'
      );
    } finally {
      setIsSaving(false);
    }
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
        <Text style={styles.headerTitle}>{i18n.t('settings.language')}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator
        persistentScrollbar
        scrollIndicatorInsets={{ right: 1 }}
        indicatorStyle="black"
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
                  isSelected ? styles.selectedLanguageButton : styles.unselectedLanguageButton,
                  isSaving && styles.disabledLanguageButton,
                ]}
              >
                <View style={styles.languageContent}>
                  <Text
                    style={[
                      styles.languageName,
                      isSelected ? styles.selectedLanguageName : styles.unselectedLanguageName,
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
  selectedLanguageButton: {
    backgroundColor: '#000000',
  },
  unselectedLanguageButton: {
    backgroundColor: '#F0F0F0',
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
  selectedLanguageName: {
    color: '#FFFFFF',
  },
  unselectedLanguageName: {
    color: '#000000',
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
