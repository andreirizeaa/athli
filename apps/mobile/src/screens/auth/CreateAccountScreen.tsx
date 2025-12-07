import { useNavigation } from '@react-navigation/native';
import * as AppleAuthentication from 'expo-apple-authentication';
import Constants from 'expo-constants';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { Mail } from 'lucide-react-native';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LoadingOverlay } from '../../components/ui/overlays/LoadingOverlay';
import { appColors } from '../../constants/appColorScheme';
import { useOnboarding } from '../../context/OnboardingContext';
import { supabase } from '../../lib/supabase';
import { showAlert } from '../../services/alertService';
import { registerAndSaveExpoPushToken } from '../../services/push';
import { setUserId } from '../../services/storageService';
import { fetchUserById } from '../../services/userService';
import { hapticFeedback } from '../../utils/haptic';
import i18n from '../../utils/i18n';

interface CreateAccountScreenProps {
  onNext: () => void;
  onBack: () => void;
}

export function CreateAccountScreen({ onNext, onBack }: CreateAccountScreenProps) {
  const { onboardingData, updateOnboardingData } = useOnboarding();
  const navigation = useNavigation<any>();
  const [isSigningIn, setIsSigningIn] = React.useState(false);

  const isExpoGo = Constants.appOwnership === 'expo';

  // Configure Google Sign-In only if not in Expo Go
  // Note: We don't pre-configure here to avoid native module crashes
  // Configuration will happen right before sign-in
  React.useEffect(() => {
    // Intentionally empty - configuration happens on-demand in handleGoogleSignIn
  }, [isExpoGo]);

  const handleGoogleSignIn = async () => {
    try {
      hapticFeedback.selection();
      if (isExpoGo) {
        showAlert('Error', 'Google Sign-In is not available in Expo Go. Please use a development build.');
        return;
      }

      const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
      if (!googleClientId) {
        showAlert('Error', 'Google Sign-In is not configured. Please check your environment variables.');
        return;
      }

      const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
      
      // Ensure Google Sign-In is configured before attempting sign in
      GoogleSignin.configure({
        scopes: ['email', 'profile'],
        iosClientId: googleClientId,
      });

      // hasPlayServices() is Android-only, skip on iOS
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices();
      }
      
      setIsSigningIn(true);
      const userInfo = await GoogleSignin.signIn();

      if (userInfo.idToken) {
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: userInfo.idToken,
        });
        if (error) {
          showAlert(
            'Sign In Error',
            error.message || 'Unable to sign in with Google. Please try again.',
            undefined,
            'CREATE_ACCOUNT_GOOGLE_SIGN_IN_ERROR'
          );
          setIsSigningIn(false);
        } else {
          if (data.user?.id) {
            try {
              await setUserId(data.user.id);
              handleNewAccount(data);
            } catch (persistError) {
              showAlert(
                'Error',
                'An error occurred while setting up your account. Please try again.',
                undefined,
                'CREATE_ACCOUNT_GOOGLE_SETUP_ERROR',
                persistError
              );
              setIsSigningIn(false);
            }
          } else {
            setIsSigningIn(false);
            showAlert('Error', 'No user data received from Google Sign-In.');
          }
        }
      } else {
        setIsSigningIn(false);
        showAlert('Error', 'No ID token received from Google Sign-In.');
      }
    } catch (error: any) {
      setIsSigningIn(false);
      // Only show error if it's not a user cancellation
      if (error?.code !== 'SIGN_IN_CANCELLED' && error?.code !== '10') {
        console.error('Google Sign-In error:', error);
        showAlert(
          'Sign In Error',
          error?.message || 'An error occurred during Google Sign-In. Please try again.',
          undefined,
          'CREATE_ACCOUNT_GOOGLE_SIGN_IN_ERROR'
        );
      }
    }
  };

  const handleAppleSignIn = async () => {
    setIsSigningIn(true);
    try {
      hapticFeedback.selection();
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (credential.identityToken) {
        const { error, data } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
        });

        if (error) {
          showAlert(
            'Sign In Error',
            'Unable to sign in with Apple. Please try again.',
            undefined,
            'CREATE_ACCOUNT_APPLE_SIGN_IN_ERROR'
          );
          setIsSigningIn(false);
        } else {
          if (data.user?.id) {
            try {
              await setUserId(data.user.id);
              handleNewAccount(data);
            } catch (persistError) {
              showAlert(
                'Error',
                'An error occurred while setting up your account. Please try again.',
                undefined,
                'CREATE_ACCOUNT_APPLE_SETUP_ERROR',
                persistError
              );
              setIsSigningIn(false);
            }
          }
        }
      } else {
        throw new Error('No identityToken.');
      }
    } catch (e: any) {
      setIsSigningIn(false);
    }
  };

  const handleTermsOfServicePress = async () => {
    hapticFeedback.selection();
    setTimeout(async () => {
      try {
        await Linking.openURL('https://useformai.com/legal/tos');
      } catch (error) {
        showAlert('Error', 'Unable to open terms of use. Please try again later.');
      }
    }, 100);
  };

  const handlePrivacyPolicyPress = async () => {
    hapticFeedback.selection();
    setTimeout(async () => {
      try {
        await Linking.openURL('https://useformai.com/legal/privacy');
      } catch (error) {
        showAlert('Error', 'Unable to open privacy policy. Please try again later.');
      }
    }, 100);
  };

  const handleNewAccount = async (data: any) => {
    const signInMethod = data.user?.app_metadata?.provider || 'apple';

    if (data.user?.id) {
      // Navigate to loading screen immediately
      onNext();

      // Check if user already exists in the database
      const { user: existingUser } = await fetchUserById(data.user.id);

      if (existingUser) {
        // User already exists, navigate to main app
        try {
          // Register Expo push token for existing user
          await registerAndSaveExpoPushToken(data.user.id);
          setIsSigningIn(false);
          // AccountLoading screen will handle next navigation
        } catch (error) {
          showAlert(
            'Error',
            'An error occurred while signing in. Please try again.',
            undefined,
            'CREATE_ACCOUNT_EXISTING_USER_ERROR',
            error
          );
          setIsSigningIn(false);
        }
        return;
      }

      // New user - proceed with onboarding setup
      const profilePicture: string | null =
        (data?.user?.user_metadata?.avatar_url as string | undefined) ??
        (data?.user?.user_metadata?.picture as string | undefined) ??
        null;

      const updatedData = {
        ...onboardingData,
        signInMethod: signInMethod,
        onboardingCompleted: true,
        walkthroughCompleted: false,
        userId: data.user?.id,
        profilePicture: profilePicture,
      };

      updateOnboardingData('signInMethod', signInMethod);
      updateOnboardingData('onboardingCompleted', true);
      updateOnboardingData('walkthroughCompleted', false);
      updateOnboardingData('userId', data.user.id);
      updateOnboardingData('profilePicture', profilePicture);

      try {
        // Register Expo push token and persist it before onboarding persistence
        await registerAndSaveExpoPushToken(data.user.id);
        const { saveOnboardingProgress } = await import('../../services/onboardingService');
        await saveOnboardingProgress(updatedData);
        setIsSigningIn(false);
        // AccountLoading screen will handle next navigation
      } catch (persistError) {
        showAlert(
          'Error',
          'An error occurred while setting up your account. Please try again.',
          undefined,
          'CREATE_ACCOUNT_GENERAL_SETUP_ERROR',
          persistError
        );
        setIsSigningIn(false);
      }
    } else {
      setIsSigningIn(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Button container */}
        <View style={styles.buttonContainer}>
          {/* Sign in with Apple */}
          <TouchableOpacity
            style={[
              styles.appleButton,
              { backgroundColor: appColors.onboarding.signIn.appleButton.background },
            ]}
            onPress={handleAppleSignIn}
            activeOpacity={0.8}
          >
            <View style={styles.buttonContent}>
              <Image
                source={require('../../../assets/icons/apple.png')}
                style={[
                  styles.appleIcon,
                  { tintColor: appColors.onboarding.signIn.appleButton.iconTint },
                ]}
              />
              <Text
                style={[
                  styles.appleButtonText,
                  { color: appColors.onboarding.signIn.appleButton.text },
                ]}
              >
                {i18n.t('onboarding.createAccount.signInWithApple')}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Sign in with Google */}
          <TouchableOpacity
            style={[
              styles.googleButton,
              {
                backgroundColor: appColors.onboarding.signIn.googleButton.background,
                borderColor: appColors.onboarding.signIn.googleButton.border,
                borderWidth: 1,
              },
            ]}
            onPress={
              isExpoGo
                ? () => {
                    hapticFeedback.selection();
                  }
                : handleGoogleSignIn
            }
            activeOpacity={0.8}
          >
            <View style={styles.buttonContent}>
              <Image
                source={require('../../../assets/icons/google.png')}
                style={styles.googleIcon}
              />
              <Text
                style={[
                  styles.googleButtonText,
                  { color: appColors.onboarding.signIn.googleButton.text },
                ]}
              >
                {i18n.t('onboarding.createAccount.signInWithGoogle')}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Sign in with Email */}
          <TouchableOpacity
            style={[
              styles.googleButton,
              {
                backgroundColor: appColors.onboarding.signIn.googleButton.background,
                borderColor: appColors.onboarding.signIn.googleButton.border,
                borderWidth: 1,
              },
            ]}
            onPress={() => {
              hapticFeedback.selection();
              navigation.navigate('EmailSignIn', { mode: 'signUp' });
            }}
            activeOpacity={0.8}
          >
            <View style={styles.buttonContent}>
              <Mail
                width={28}
                height={28}
                color={appColors.onboarding.signIn.googleButton.text}
                style={{ marginRight: 12 }}
              />
              <Text
                style={[
                  styles.googleButtonText,
                  { color: appColors.onboarding.signIn.googleButton.text },
                ]}
              >
                {i18n.t('onboarding.createAccount.signInWithEmail') || 'Sign in with Email'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Terms and Privacy Policy */}
        <View style={styles.termsContainer}>
          <Text style={[styles.termsText, { color: appColors.onboarding.signIn.terms.text }]}>
            {i18n.t('termsAgreement')}{' '}
          </Text>
          <TouchableOpacity onPress={handleTermsOfServicePress}>
            <Text style={[styles.termsLink, { color: appColors.onboarding.signIn.terms.link }]}>
              {i18n.t('termsOfUse')}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.termsText, { color: appColors.onboarding.signIn.terms.text }]}>
            {i18n.t('and')}{' '}
          </Text>
          <TouchableOpacity onPress={handlePrivacyPolicyPress}>
            <Text style={[styles.termsLink, { color: appColors.onboarding.signIn.terms.link }]}>
              {i18n.t('privacyPolicy')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <LoadingOverlay visible={isSigningIn} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: appColors.general.background,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  buttonContainer: {
    gap: 16,
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  appleButton: {
    width: '90%',
    height: 65,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButton: {
    width: '90%',
    height: 65,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appleIcon: {
    width: 32,
    height: 32,
    marginRight: 12,
  },
  googleIcon: {
    width: 32,
    height: 32,
    marginRight: 12,
  },
  appleButtonText: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  googleButtonText: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    paddingHorizontal: 40,
  },
  termsText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    textAlign: 'center',
  },
  termsLink: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    textDecorationLine: 'underline',
  },
});
