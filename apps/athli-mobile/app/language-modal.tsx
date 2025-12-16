import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { CircleCheck, X } from 'lucide-react-native';
import { Platform } from 'react-native';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { LANGUAGES } from '@/constants/languages';
import { PlatformIcon } from '@/components/platform-icon';

export default function LanguageModal() {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const [selectedLanguageCode, setSelectedLanguageCode] = useState<string>('en');

  const dividerColor = themeColors.border;
  const iconColor = themeColors.text;

  const handleClose = () => {
    router.back();
  };

  const handleSelectLanguage = (code: string) => {
    setSelectedLanguageCode(code);
    // TODO: Implement language change logic
    handleClose();
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? 20 + insets.top : 20, backgroundColor: themeColors.background }]}>
        <IconButton
          icon={{ sf: 'xmark', IconComponent: X }}
          onPress={handleClose}
          size="md"
          color={iconColor}
          backgroundColor={themeColors.surfaceSecondary}
        />
        <Text style={[styles.title, { color: themeColors.text }]}>{t('preferences.selectLanguage')}</Text>
        <View style={styles.closeButton} />
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {LANGUAGES.map((language, index) => {
          const isSelected = language.code === selectedLanguageCode;

          return (
            <View key={language.code}>
              <TouchableOpacity
                style={styles.languageRow}
                activeOpacity={0.7}
                onPress={() => handleSelectLanguage(language.code)}
              >
                <View style={styles.languageInfo}>
                  <Text style={styles.languageFlag}>{language.flag}</Text>
                  <View style={styles.languageTextContainer}>
                    <Text
                      style={[
                        styles.languageNativeName,
                        { color: themeColors.text },
                      ]}
                    >
                      {language.nativeName}
                    </Text>
                  </View>
                </View>

                {isSelected && (
                  <PlatformIcon
                    sf="checkmark.circle.fill"
                    IconComponent={CircleCheck}
                    size={iconSizes.modalIcons}
                    color={iconColor}
                  />
                )}
              </TouchableOpacity>

              {index !== LANGUAGES.length - 1 && (
                <View style={[styles.modalDivider, { backgroundColor: dividerColor }]} />
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderTopWidth: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: {
    ...typography.h6,
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  languageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  languageFlag: {
    ...typography.h6,
    marginRight: 12,
  },
  languageTextContainer: {
    flexShrink: 1,
  },
  languageNativeName: {
    ...typography.p2,
    marginTop: 2,
  },
  modalDivider: {
    height: 1,
  },
});
