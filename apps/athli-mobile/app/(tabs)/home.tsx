import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { typography } from '@/constants/typography';
import { useThemePreference, useAuth } from '@/stores';
import { useTranslations } from '@/stores';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';

export default function HomeScreen() {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const { coachProfile, clientProfile } = useAuth();

  const greeting = useMemo(() => {
    const profile = coachProfile || clientProfile;
    if (profile?.name) {
      const firstName = profile.name.split(' ')[0];
      return `Hey ${firstName}`;
    }
    return t('home.title');
  }, [coachProfile, clientProfile, t]);

  return (
    <ScreenWrapper scrollable={false}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: themeColors.text }]}>{greeting}</Text>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  title: {
    ...typography.h1,
    textAlign: 'left',
  },
});
