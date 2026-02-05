import { StyleSheet, View, Text, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { PressableScale } from 'pressto';
import Constants from 'expo-constants';

import { typography } from '@/constants/typography';
import { useThemePreference, useTranslations } from '@/stores';

export default function DeleteAccountModal() {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();

  const handleGoToDashboard = () => {
    const webAppUrl = process.env.EXPO_PUBLIC_WEB_APP_URL ||
      Constants.expoConfig?.extra?.EXPO_PUBLIC_WEB_APP_URL ||
      'http://localhost:3001';

    Linking.openURL(`${webAppUrl}/settings/account`);
    router.back();
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.backgroundSecondary, paddingBottom: 200 }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: themeColors.text }]}>
          {t('profile.deleteAccountModal.title')}
        </Text>

        <Text style={[styles.message, { color: themeColors.mutedText }]}>
          {t('profile.deleteAccountModal.message')}
        </Text>

        <View style={styles.buttonContainer}>
          <PressableScale
            style={[styles.dashboardButton, { backgroundColor: '#FFFFFF' }]}
            onPress={handleGoToDashboard}
          >
            <Text style={[styles.dashboardButtonText, { color: '#000000' }]}>
              {t('profile.deleteAccountModal.goToDashboard')}
            </Text>
          </PressableScale>

          <PressableScale
            style={[styles.cancelButton, { borderColor: themeColors.text }]}
            onPress={handleCancel}
          >
            <Text style={[styles.cancelButtonText, { color: themeColors.text }]}>
              {t('general.cancel')}
            </Text>
          </PressableScale>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
  },
  title: {
    ...typography.h1,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    ...typography.p2,
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  dashboardButton: {
    width: '100%',
    height: 55,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashboardButtonText: {
    ...typography.p2,
    fontWeight: '700',
  },
  cancelButton: {
    width: '100%',
    height: 55,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  cancelButtonText: {
    ...typography.p2,
    fontWeight: '700',
  },
});
