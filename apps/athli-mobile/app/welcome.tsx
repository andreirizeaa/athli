import { StyleSheet, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PressableScale } from 'pressto';

import { typography } from '@/constants/typography';
import { useThemePreference, useTranslations } from '@/stores';

export default function WelcomeScreen() {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const router = useRouter();

  const handleGetStartedPress = () => {
    // TODO: Navigate to get started flow
  };

  const handleSignInPress = () => {
    router.push('/modals/auth/sign-in-modal');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.backgroundPrimary }} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: themeColors.text }]}>{t('welcome.title')}</Text>
        </View>

        <View style={styles.buttonContainer}>
          <PressableScale
            style={[styles.filledButton, { backgroundColor: themeColors.text }]}
            onPress={handleGetStartedPress}
          >
            <Text style={[styles.filledButtonText, { color: themeColors.backgroundPrimary }]}>{t('welcome.getStarted')}</Text>
          </PressableScale>

          <PressableScale
            style={[styles.outlinedButton, { borderColor: themeColors.text }]}
            onPress={handleSignInPress}
          >
            <Text style={[styles.outlinedButtonText, { color: themeColors.text }]}>{t('welcome.alreadyHaveAccount')}</Text>
          </PressableScale>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  titleContainer: {
    flex: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...typography.h1,
  },
  buttonContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  filledButton: {
    width: '100%',
    height: 55,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filledButtonText: {
    ...typography.h6,
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  outlinedButton: {
    width: '100%',
    height: 55,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  outlinedButtonText: {
    ...typography.h6,
    fontWeight: 700,
    textTransform: 'uppercase',
  },
});
