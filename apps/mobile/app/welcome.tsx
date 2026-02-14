import { StyleSheet, View, Text, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PressableOpacity } from 'pressto';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';

import { Dialog } from '@/components/ui/dialog';
import { FilledButton } from '@/components/ui/buttons/filled-button';
import { OutlinedButton } from '@/components/ui/buttons/outlined-button';
import { typography } from '@/constants/typography';
import { useTranslations, useCoachProfileStore, useClientProfileStore, useAppView, useThemePreference, useColorScheme } from '@/stores';
import { AuthLoadingOverlay } from '@/components/auth/auth-loading-overlay';
import { CoachSelectionDialog } from '@/components/auth/coach-selection-dialog';
import { authenticateUser } from '@/services/auth/supabase-auth';
import { haptics } from '@/utils/haptics';
import type { CoachProfile, ClientProfile, AuthResult } from '@/types/profile';

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
  const [showCoachSelectionDialog, setShowCoachSelectionDialog] = useState(false);
  const [pendingAuthResult, setPendingAuthResult] = useState<AuthResult | null>(null);
  const setCoachProfile = useCoachProfileStore((state) => state.setProfile);
  const setClientProfile = useClientProfileStore((state) => state.setProfile);

  const backgroundImage = isDark
    ? require('@/assets/backgrounds/dark.png')
    : require('@/assets/backgrounds/light.png');

  const handleAuthSuccess = (result: AuthResult) => {
    const { profileType, profile, coachAssignments } = result;

    if (profileType === 'coach') {
      setCoachProfile(profile as CoachProfile);
      setAppView('coach');
      router.replace('/(tabs)');
      return;
    }

    // Client flow - check coach assignments
    if (!coachAssignments || coachAssignments.length === 0) {
      // No coach assigned - show error
      setErrorDialog({
        title: t('auth.noCoachAssignment'),
        message: t('auth.noCoachAssignmentMessage'),
      });
      setShowErrorDialog(true);
      return;
    }

    if (coachAssignments.length === 1) {
      // Single coach - auto-select and navigate
      const clientProfile = profile as ClientProfile;
      clientProfile.coach_id = coachAssignments[0].coach_id;
      setClientProfile(clientProfile);
      setAppView('athlete');
      router.replace('/(tabs)');
      return;
    }

    // Multiple coaches - show selection dialog
    setPendingAuthResult(result);
    setShowCoachSelectionDialog(true);
  };

  const handleCoachSelected = (coachId: string) => {
    if (!pendingAuthResult) return;

    const clientProfile = pendingAuthResult.profile as ClientProfile;
    clientProfile.coach_id = coachId;
    setClientProfile(clientProfile);
    setAppView('athlete');
    setShowCoachSelectionDialog(false);
    setPendingAuthResult(null);
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
      handleAuthSuccess(result);
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
      handleAuthSuccess(result);
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

  const handleTermsOfServicePress = async () => {
    await WebBrowser.openBrowserAsync('https://app.tryathli.com/', {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      dismissButtonStyle: 'done',
      showTitle: true,
    });
  };

  const handlePrivacyPolicyPress = async () => {
    await WebBrowser.openBrowserAsync('https://app.tryathli.com/', {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      dismissButtonStyle: 'done',
      showTitle: true,
    });
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
              <FilledButton
                label={t('auth.continueWithApple')}
                onPress={handleAppleSignIn}
                disabled={isLoading}
                backgroundColor={themeColors.text}
                textColor={themeColors.backgroundPrimary}
                size="lg"
                icon={
                  <Image
                    source={require('@/assets/icons/apple.png')}
                    style={styles.icon}
                    tintColor={themeColors.backgroundPrimary}
                    contentFit="contain"
                  />
                }
                style={styles.authButton}
                textStyle={styles.authButtonText}
              />
            )}

            <FilledButton
              label={t('auth.continueWithGoogle')}
              onPress={handleGoogleSignIn}
              disabled={isLoading}
              backgroundColor={themeColors.text}
              textColor={themeColors.backgroundPrimary}
              size="lg"
              icon={
                <Image
                  source={require('@/assets/icons/google.png')}
                  style={styles.icon}
                  contentFit="contain"
                />
              }
              style={styles.authButton}
              textStyle={styles.authButtonText}
            />

            <OutlinedButton
              label={t('auth.continueWithEmail')}
              onPress={handleEmailSignIn}
              disabled={isLoading}
              borderColor={themeColors.text}
              textColor={themeColors.text}
              size="lg"
              icon={<Ionicons name="mail-outline" size={24} color={themeColors.text} />}
              style={styles.authButton}
              textStyle={styles.authButtonText}
            />
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

      <CoachSelectionDialog
        visible={showCoachSelectionDialog}
        coaches={pendingAuthResult?.coachAssignments || []}
        onSelect={handleCoachSelected}
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
  authButton: {
    borderRadius: 28,
  },
  authButtonText: {
    ...typography.h6,
    fontWeight: '700',
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