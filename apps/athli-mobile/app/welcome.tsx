import { StyleSheet, View, Text, Platform, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PressableScale, PressableOpacity } from 'pressto';
import { LinearGradient } from 'expo-linear-gradient';
import SquircleView from 'react-native-fast-squircle';
import { Ionicons } from '@expo/vector-icons';

import { typography } from '@/constants/typography';
import { useTranslations, useThemePreference, useCoachProfileStore, useClientProfileStore, useAppView } from '@/stores';
import { AuthLoadingOverlay } from '@/components/auth/auth-loading-overlay';
import { authenticateUser } from '@/services/auth/supabase-auth';
import type { CoachProfile, ClientProfile } from '@/types/profile';

export default function WelcomeScreen() {
  const { t } = useTranslations();
  const { colors: themeColors } = useThemePreference();
  const router = useRouter();
  const { setAppView } = useAppView();
  const [isLoading, setIsLoading] = useState(false);
  const setCoachProfile = useCoachProfileStore((state) => state.setProfile);
  const setClientProfile = useClientProfileStore((state) => state.setProfile);

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
      Alert.alert(
        t('auth.noAccountFound'),
        t('auth.noAccountFoundMessage'),
        [{ text: t('general.ok') }]
      );
    } else {
      Alert.alert(
        t('auth.signInError'),
        error.message || t('auth.signInErrorMessage'),
        [{ text: t('general.ok') }]
      );
    }
  };

  const handleGoogleSignIn = async () => {
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
    router.push('/auth/email-sign-in');
  };

  const handleTermsOfServicePress = () => {
    // TODO: Navigate to Terms of Service
  };

  const handlePrivacyPolicyPress = () => {
    // TODO: Navigate to Privacy Policy
  };

  return (
    <View style={styles.container}>
      <AuthLoadingOverlay visible={isLoading} />

      {/* Background Gradient */}
      <LinearGradient
        colors={['#1c1c1e', '#000000']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.6 }}
      />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.content}>
          <View style={styles.imageContainer}>
            <SquircleView
              style={styles.squircle}
              cornerSmoothing={1}
            >
              <Image
                source={require('@/assets/app-icons/ios-icon-dark.png')}
                style={styles.heroImage}
                resizeMode="contain"
              />
            </SquircleView>
          </View>

          <Text style={styles.motto}>
            ELEVATE YOUR{'\n'}POTENTIAL.
          </Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.buttonContainer}>
            {Platform.OS === 'ios' && (
              <PressableScale
                style={styles.filledButton}
                onPress={handleAppleSignIn}
                enabled={!isLoading}
              >
                <View style={styles.buttonIconLeft}>
                  <Image
                    source={require('@/assets/icons/apple.png')}
                    style={[styles.icon, { tintColor: '#000000' }]}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.filledButtonText}>
                  {t('auth.continueWithApple')}
                </Text>
              </PressableScale>
            )}

            <PressableScale
              style={styles.filledButton}
              onPress={handleGoogleSignIn}
              enabled={!isLoading}
            >
              <View style={styles.buttonIconLeft}>
                <Image
                  source={require('@/assets/icons/google.png')}
                  style={styles.icon}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.filledButtonText}>
                {t('auth.continueWithGoogle')}
              </Text>
            </PressableScale>

            <PressableScale
              style={styles.outlinedButton}
              onPress={handleEmailSignIn}
              enabled={!isLoading}
            >
              <View style={styles.buttonIconLeft}>
                <Ionicons name="mail-outline" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.outlinedButtonText}>
                {t('auth.continueWithEmail')}
              </Text>
            </PressableScale>
          </View>

          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              {t('auth.termsAgreement')}{' '}
            </Text>
            <PressableOpacity onPress={handleTermsOfServicePress}>
              <Text style={styles.termsLink}>
                {t('auth.termsOfUse')}
              </Text>
            </PressableOpacity>
            <Text style={styles.termsText}>
              {' '}{t('auth.and')}{' '}
            </Text>
            <PressableOpacity onPress={handlePrivacyPolicyPress}>
              <Text style={styles.termsLink}>
                {t('auth.privacyPolicy')}
              </Text>
            </PressableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 48,
  },
  imageContainer: {
    marginBottom: 0,
  },
  squircle: {
    width: 180,
    height: 180,
    borderRadius: 50,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 12,
  },
  heroImage: {
    width: 150,
    height: 150,
  },
  motto: {
    ...typography.h1,
    fontSize: 56,
    lineHeight: 60,
    color: '#FFFFFF',
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
  filledButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 55,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
  },
  filledButtonText: {
    ...typography.h6,
    fontWeight: '700',
    color: '#000000',
  },
  outlinedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 55,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    backgroundColor: 'transparent',
  },
  outlinedButtonText: {
    ...typography.h6,
    fontWeight: '700',
    color: '#FFFFFF',
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
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
  termsLink: {
    ...typography.p3,
    fontWeight: '600',
    color: '#FFFFFF',
    textDecorationLine: 'underline',
  },
});