import React, { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { PressableOpacity } from 'pressto';
import { ChevronRight, Sparkles } from 'lucide-react-native';
import { SymbolView } from 'expo-symbols';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference, useAuth, useAppView } from '@/stores';
import { useTranslations } from '@/stores';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { Card } from '@/components/ui/card';

// AI Assistant Card for coach view
const AIAssistantCard = () => {
  const { colors: themeColors, primaryColor } = useThemePreference();
  const { t } = useTranslations();
  const router = useRouter();

  const handlePress = () => {
    router.push('/assistant');
  };

  const renderSparklesIcon = () => {
    if (Platform.OS === 'ios') {
      return <SymbolView name="sparkles" tintColor={primaryColor} size={iconSizes.tabBarIcons} type="monochrome" />;
    }
    return <Sparkles {...({ size: iconSizes.tabBarIcons, color: primaryColor } as any)} />;
  };

  return (
    <PressableOpacity onPress={handlePress}>
      <Card>
        <View style={styles.assistantCardContent}>
          <View style={styles.assistantCardIconContainer}>
            {renderSparklesIcon()}
          </View>
          <View style={styles.assistantCardInfo}>
            <Text style={[styles.assistantCardTitle, { color: themeColors.text }]}>
              {t('clientDetail.assistant.helpTitle')}
            </Text>
            <Text style={[styles.assistantCardSubtitle, { color: themeColors.mutedText }]}>
              {t('clientDetail.assistant.emptyState')}
            </Text>
          </View>
          <ChevronRight {...({ size: 20, color: themeColors.mutedText } as any)} />
        </View>
      </Card>
    </PressableOpacity>
  );
};

// Coach home content
const CoachHomeContent = () => {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const { coachProfile } = useAuth();

  const greeting = useMemo(() => {
    if (coachProfile?.name) {
      const firstName = coachProfile.name.split(' ')[0];
      return `Hey ${firstName}`;
    }
    return t('home.title');
  }, [coachProfile, t]);

  return (
    <ScreenWrapper scrollable>
      <View style={styles.header}>
        <Text style={[styles.title, { color: themeColors.text }]}>{greeting}</Text>
      </View>
      <View style={styles.cardsContainer}>
        <AIAssistantCard />
      </View>
    </ScreenWrapper>
  );
};

// Athlete home content
const AthleteHomeContent = () => {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const { clientProfile } = useAuth();

  const greeting = useMemo(() => {
    if (clientProfile?.name) {
      const firstName = clientProfile.name.split(' ')[0];
      return `Hey ${firstName}`;
    }
    return t('home.title');
  }, [clientProfile, t]);

  return (
    <ScreenWrapper scrollable={false}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: themeColors.text }]}>{greeting}</Text>
      </View>
    </ScreenWrapper>
  );
};

export default function HomeScreen() {
  const { appView } = useAppView();

  if (appView === 'coach') {
    return <CoachHomeContent />;
  }

  return <AthleteHomeContent />;
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
  cardsContainer: {
    paddingHorizontal: 16,
  },
  assistantCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  assistantCardIconContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  assistantCardInfo: {
    flex: 1,
  },
  assistantCardTitle: {
    ...typography.h5,
    marginBottom: 4,
  },
  assistantCardSubtitle: {
    ...typography.p3,
  },
});
