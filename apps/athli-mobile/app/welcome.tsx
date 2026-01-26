import { StyleSheet, View, Text, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PressableScale, PressableOpacity } from 'pressto';
import { Ionicons } from '@expo/vector-icons';

import SquircleView from 'react-native-fast-squircle';

import { Dialog } from '@/components/ui/dialog';
import { typography } from '@/constants/typography';
import { useTranslations, useCoachProfileStore, useClientProfileStore, useAppView, useThemePreference, useColorScheme } from '@/stores';
import { AuthLoadingOverlay } from '@/components/auth/auth-loading-overlay';
import { authenticateUser } from '@/services/auth/supabase-auth';
import { haptics } from '@/utils/haptics';
import type { CoachProfile, ClientProfile } from '@/types/profile';

export default function WelcomeScreen() {
  const { t } = useTranslations();
  const router = useRouter();
  const { setAppView } = useAppView();
  const { colors: themeColors } = useThemePreference();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [isLoading, setIsLoading] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorDialog, setErrorDialog] = useState({ title: '', message: '' });
  const setCoachProfile = useCoachProfileStore((state) => state.setProfile);
  const setClientProfile = useClientProfileStore((state) => state.setProfile);

  const backgroundImage = isDark
    ? require('@/assets/backgrounds/dark.png')
    : require('@/assets/backgrounds/light.png');

  const handleAuthSuccess = (profileType: 'coach' | 'client', profile: CoachProfile | ClientProfile) => {
    if (profileType === 'coach') {
      setCoachProfile(profile as CoachProfile);
      setAppView('coach');
    } else {
      setClientProfile(profile as ClientProfile);
      setAppView('athlete');
    }
    router.replace('/(tabs)');
  };

  const handleAuthError = (error: any) => {
    const isCancelled =
      error.message?.includes('cancelled') ||
      error.message?.includes('canceled');

    if (isCancelled) {
      return;
    }

    if (error.message === 'NO_PROFILE_FOUND') {
      setErrorDialog({
        title: t('auth.noAccountFound'),
        message: t('auth.noAccountFoundMessage'),
      });
    } else {
      setErrorDialog({
        title: t('auth.signInError'),
        message: error.message || t('auth.signInErrorMessage'),
      });
    }
    setShowErrorDialog(true);
  };

  const handleGoogleSignIn = async () => {
    haptics.medium();
    setIsLoading(true);
    try {
      const result = await authenticateUser('google');
      handleAuthSuccess(result.profileType!, result.profile as any);
    } catch (error) {
      handleAuthError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    haptics.medium();
    setIsLoading(true);
    try {
      const result = await authenticateUser('apple');
      handleAuthSuccess(result.profileType!, result.profile as any);
    } catch (error) {
      handleAuthError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignIn = () => {
    haptics.medium();
    router.push('/auth/email-sign-in');
  };

  const handleTermsOfServicePress = () => {
    // TODO: Navigate to Terms of Service
  };

  const handlePrivacyPolicyPress = () => {
    // TODO: Navigate to Privacy Policy
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.backgroundPrimary }]}>
      <Image
        source={backgroundImage}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        priority="high"
        cachePolicy="memory-disk"
      />
      <AuthLoadingOverlay visible={isLoading} />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.spacer} />

        <View style={styles.footer}>
          <Text style={[styles.motto, { color: themeColors.text }]}>
            ELEVATE YOUR{'\n'}POTENTIAL.
          </Text>
          <View style={styles.buttonContainer}>
            {Platform.OS === 'ios' && (
              <PressableScale
                style={styles.buttonWrapper}
                onPress={handleAppleSignIn}
                enabled={!isLoading}
              >
                <SquircleView style={[styles.filledButton, { backgroundColor: themeColors.text }]} cornerSmoothing={1}>
                  <View style={styles.buttonIconLeft}>
                    <Image
                      source={require('@/assets/icons/apple.png')}
                      style={styles.icon}
                      tintColor={themeColors.backgroundPrimary}
                      contentFit="contain"
                    />
                  </View>
                  <Text style={[styles.filledButtonText, { color: themeColors.backgroundPrimary }]}>
                    {t('auth.continueWithApple')}
                  </Text>
                </SquircleView>
              </PressableScale>
            )}

            <PressableScale
              style={styles.buttonWrapper}
              onPress={handleGoogleSignIn}
              enabled={!isLoading}
            >
              <SquircleView style={[styles.filledButton, { backgroundColor: themeColors.text }]} cornerSmoothing={1}>
                <View style={styles.buttonIconLeft}>
                  <Image
                    source={require('@/assets/icons/google.png')}
                    style={styles.icon}
                    contentFit="contain"
                  />
                </View>
                <Text style={[styles.filledButtonText, { color: themeColors.backgroundPrimary }]}>
                  {t('auth.continueWithGoogle')}
                </Text>
              </SquircleView>
            </PressableScale>

            <PressableScale
              style={styles.buttonWrapper}
              onPress={handleEmailSignIn}
              enabled={!isLoading}
            >
              <SquircleView style={[styles.outlinedButton, { borderColor: themeColors.text }]} cornerSmoothing={1}>
                <View style={styles.buttonIconLeft}>
                  <Ionicons name="mail-outline" size={24} color={themeColors.text} />
                </View>
                <Text style={[styles.outlinedButtonText, { color: themeColors.text }]}>
                  {t('auth.continueWithEmail')}
                </Text>
              </SquircleView>
            </PressableScale>
          </View>

          <View style={styles.termsContainer}>
            <Text style={[styles.termsText, { color: themeColors.mutedText }]}>
              {t('auth.termsAgreement')}{' '}
            </Text>
            <PressableOpacity onPress={handleTermsOfServicePress}>
              <Text style={[styles.termsLink, { color: themeColors.text }]}>
                {t('auth.termsOfUse')}
              </Text>
            </PressableOpacity>
            <Text style={[styles.termsText, { color: themeColors.mutedText }]}>
              {' '}{t('auth.and')}{' '}
            </Text>
            <PressableOpacity onPress={handlePrivacyPolicyPress}>
              <Text style={[styles.termsLink, { color: themeColors.text }]}>
                {t('auth.privacyPolicy')}
              </Text>
            </PressableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <Dialog
        visible={showErrorDialog}
        onClose={() => setShowErrorDialog(false)}
        title={errorDialog.title}
        message={errorDialog.message}
        showCloseIcon={false}
        buttons={[
          {
            label: t('general.ok'),
            onPress: () => setShowErrorDialog(false),
            variant: 'primary',
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  spacer: {
    flex: 1,
  },
  motto: {
    marginBottom: 32,
    ...typography.h1,
    fontSize: 56,
    lineHeight: 60,
    textTransform: 'uppercase',
    letterSpacing: -1.5,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 8 : 24,
  },
  buttonContainer: {
    gap: 12,
  },
  buttonWrapper: {
    height: 55,
    borderRadius: 28,
  },
  filledButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
  },
  filledButtonText: {
    ...typography.h6,
    fontWeight: '700',
  },
  outlinedButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  outlinedButtonText: {
    ...typography.h6,
    fontWeight: '700',
  },
  buttonIconLeft: {
    position: 'absolute',
    left: 20,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 24,
    height: 24,
  },
  termsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    paddingHorizontal: 20,
  },
  termsText: {
    ...typography.p3,
    textAlign: 'center',
  },
  termsLink: {
    ...typography.p3,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});