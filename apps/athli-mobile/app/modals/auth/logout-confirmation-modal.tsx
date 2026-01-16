import { StyleSheet, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { PressableScale } from 'pressto';

import { typography } from '@/constants/typography';
import { useColorScheme, useThemePreference, useTranslations } from '@/stores';
import { signOut } from '@/services/auth/supabase-auth';

export default function LogoutConfirmationModal() {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const colorScheme = useColorScheme();
  const { t } = useTranslations();

  const isDark = colorScheme === 'dark';
  const buttonColor = isDark ? '#FFFFFF' : '#000000';
  const buttonTextColor = isDark ? '#000000' : '#FFFFFF';

  const handleLogout = async () => {
    try {
      console.log('🔵 [Logout Modal] Logging out...');
      await signOut();
      console.log('🟢 [Logout Modal] Logged out successfully');
      router.dismiss();
      router.replace('/welcome');
    } catch (error) {
      console.error('🔴 [Logout Modal] Logout error:', error);
      router.back();
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.backgroundSecondary, paddingBottom: 200 }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: themeColors.text }]}>
          {t('profile.logoutConfirmTitle')}
        </Text>

        <Text style={[styles.message, { color: themeColors.mutedText }]}>
          {t('profile.logoutConfirmMessage')}
        </Text>

        <View style={styles.buttonContainer}>
          <PressableScale
            style={[styles.logoutButton, { backgroundColor: buttonColor }]}
            onPress={handleLogout}
          >
            <Text style={[styles.logoutButtonText, { color: buttonTextColor }]}>
              {t('profile.logout')}
            </Text>
          </PressableScale>

          <PressableScale
            style={[styles.cancelButton, { borderColor: buttonColor }]}
            onPress={handleCancel}
          >
            <Text style={[styles.cancelButtonText, { color: buttonColor }]}>
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
    paddingBottom: 40, // Offset the content a bit since we are in a small detent
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
  logoutButton: {
    width: '100%',
    height: 55,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonText: {
    ...typography.p2,
    fontWeight: '700',
    color: '#FF3B30',
    textTransform: 'uppercase',
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
    textTransform: 'uppercase',
  },
});
