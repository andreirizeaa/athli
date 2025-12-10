import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { typography, iconSizes } from '@/constants/typography';
import { useColorScheme, useThemePreference } from '@/contexts/useColorScheme';
import { useAppView } from '@/contexts/useAppView';
import { useTranslations } from '@/contexts/useTranslations';
import { TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const { primarySoftColor, colors: themeColors } = useThemePreference();
  const { appView, setAppView } = useAppView();
  const { t } = useTranslations();

  const gradientColors: [string, string] =
    colorScheme === 'dark'
      ? ['#2a2a2a', themeColors.pageBackground]
      : [primarySoftColor, themeColors.background];

  const handleToggleView = () => {
    setAppView(appView === 'athlete' ? 'coach' : 'athlete');
  };

  return (
    <LinearGradient
      colors={gradientColors}
      locations={[0.05, 0.7]}
      style={styles.gradient}
      start={{ x: 1, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: themeColors.text }]}>{t('settings.title')}</Text>
            <TouchableOpacity
              style={[
                styles.viewToggleButton,
                {
                  backgroundColor: 'transparent',
                  borderColor: themeColors.text,
                },
              ]}
              activeOpacity={0.7}
              onPress={handleToggleView}
            >
              <View style={styles.viewToggleContent}>
                <Text style={[styles.viewToggleText, { color: themeColors.text }]}>
                  {t('settings.athleteView')}
                </Text>
                <ChevronRight size={iconSizes.extraSmallIcons} color={themeColors.text} />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  title: {
    ...typography.h1,
    textAlign: 'left',
    flex: 1,
  },
  viewToggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    alignSelf: 'center',
    marginTop: 2,
  },
  viewToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewToggleText: {
    ...typography.p5,
  },
});


