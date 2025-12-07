import { useNavigation } from '@react-navigation/native';
import * as AppleAuthentication from 'expo-apple-authentication';
import Constants from 'expo-constants';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { Mail, X } from 'lucide-react-native';
import React from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { appColors } from '../../constants/appColorScheme';
import { useOnboarding } from '../../context/OnboardingContext';
import { usePurchases } from '../../context/PurchasesContext';
import { supabase } from '../../lib/supabase';
import { showAlert } from '../../services/alertService';
import { track } from '../../services/analytics';
import { registerAndSaveExpoPushToken } from '../../services/push';
import { removeUserId, setUserId } from '../../services/storageService';
import { fetchUserById, requiresOnboarding } from '../../services/userService';
import { hapticFeedback } from '../../utils/haptic';
import i18n from '../../utils/i18n';

const { height: screenHeight } = Dimensions.get('window');

interface WelcomeScreenSignInProps {
  visible: boolean;
  onClose: () => void;
  onSignIn: () => void;
  onNavigateToOnboarding?: () => void;
  onRequirePayment?: () => void;
}

export function WelcomeScreenSignIn({
  visible,
  onClose,
  onSignIn,
  onNavigateToOnboarding,
  onRequirePayment,
}: WelcomeScreenSignInProps) {
  const [isSigningIn, setIsSigningIn] = React.useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = React.useState(false);
  const [isVisible, setIsVisible] = React.useState(false);
  const { hasSubscription, logIn } = usePurchases();
  const { updateOnboardingData } = useOnboarding();
  const navigation = useNavigation<any>();

  // Animation values - similar to feedback slideshow
  const slideAnim = React.useRef(new Animated.Value(screenHeight)).current; // Start off-screen

  // Check if we're running in Expo Go
  const isExpoGo = Constants.appOwnership === 'expo';

  // Configure Google Sign-In only if not in Expo Go
  React.useEffect(() => {
    if (!isExpoGo) {
      import('@react-native-google-signin/google-signin')
        .then(({ GoogleSignin }) => {
          GoogleSignin.configure({
            scopes: ['email', 'profile'],
            iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID!,
          });
        })
        .catch(() => {
          // Intentionally no logs
        });
    }
  }, [isExpoGo]);

  // Handle slide-in animation when visible prop changes
  React.useEffect(() => {
    if (visible && !isVisible) {
      setIsVisible(true);
      setIsAnimatingOut(false);
      Animated.timing(slideAnim, {
        toValue: 0, // Slide to visible position
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, isVisible, slideAnim]);

  const handlePostAuthentication = async (userId: string) => {
    try {
      // Set onboardingData.userId immediately after authentication
      updateOnboardingData('userId', userId);

      await setUserId(userId);
      const { user } = await fetchUserById(userId);
      if (!user) {
        hapticFeedback.error();
        // Inform user they need to complete onboarding before proceeding
        showAlert(
          i18n.t('onboarding.incompleteAccount.title'),
          i18n.t('onboarding.incompleteAccount.message'),
          () => {
            if (onNavigateToOnboarding) onNavigateToOnboarding();
            else onSignIn();
          }
        );
        return;
      }
      await logIn(userId);

      // Track sign-in completion
      track('Sign In Completed', {
        user_id: userId,
      });

      // Ensure push token is registered for signed-in users
      await registerAndSaveExpoPushToken(userId);
      if (requiresOnboarding(user)) {
        hapticFeedback.error();
        await removeUserId();
        showAlert(
          i18n.t('onboarding.incompleteAccount.title'),
          i18n.t('onboarding.incompleteAccount.message'),
          () => {
            if (onNavigateToOnboarding) onNavigateToOnboarding();
            else onSignIn();
          }
        );
        return;
      }
      if (!hasSubscription) {
        hapticFeedback.success();
        if (onRequirePayment) onRequirePayment();
        else onSignIn();
        return;
      }

      onSignIn();
    } catch {
      onSignIn();
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      hapticFeedback.selection();
      if (isExpoGo) return;

      const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
      await GoogleSignin.hasPlayServices();
      setIsSigningIn(true);
      const userInfo = await GoogleSignin.signIn();

      if (userInfo.idToken) {
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: userInfo.idToken,
        });
        if (error) {
          setIsSigningIn(false);
        } else if (data.user?.id) {
          await handlePostAuthentication(data.user.id);
          setIsSigningIn(false);
        } else {
          setIsSigningIn(false);
          onSignIn();
        }
      } else {
        setIsSigningIn(false);
      }
    } catch (error: any) {
      setIsSigningIn(false);
      // Swallow non-critical codes like user cancellation
    }
  };

  const handleAppleSignIn = async () => {
    try {
      hapticFeedback.selection();
      setIsSigningIn(true);
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
          setIsSigningIn(false);
        } else if (data.user?.id) {
          await handlePostAuthentication(data.user.id);
          setIsSigningIn(false);
        } else {
          setIsSigningIn(false);
          onSignIn();
        }
      } else {
        setIsSigningIn(false);
      }
    } catch {
      setIsSigningIn(false);
    }
  };

  const handleClose = (withHaptic = true) => {
    if (withHaptic) {
      hapticFeedback.selection();
    }
    setIsAnimatingOut(true);
    // Animate slide down before closing
    Animated.timing(slideAnim, {
      toValue: screenHeight, // Slide off-screen
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      setIsVisible(false);
      onClose();
    });
  };

  const handleTermsOfServicePress = async () => {
    hapticFeedback.selection();
    // Track sign in screen clicks
    track('Sign In Screen clicks', { event: 'Terms' });
    // Small delay to ensure haptic feedback is felt before opening browser
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
    // Track sign in screen clicks
    track('Sign In Screen clicks', { event: 'Privacy' });
    // Small delay to ensure haptic feedback is felt before opening browser
    setTimeout(async () => {
      try {
        await Linking.openURL('https://useformai.com/legal/privacy');
      } catch (error) {
        showAlert('Error', 'Unable to open privacy policy. Please try again later.');
      }
    }, 100);
  };

  if (!isVisible) return null;

  return (
    <View style={styles.overlay}>
      <TouchableOpacity
        style={styles.overlayBackground}
        activeOpacity={1}
        onPress={() => handleClose(false)}
      />

      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Header with title and close button */}
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={[styles.mainTitle, { color: appColors.onboarding.signIn.title }]}>
            {i18n.t('signIn')}
          </Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => handleClose(true)}
            activeOpacity={0.7}
          >
            <X width={20} height={20} color={appColors.onboarding.signIn.closeButton} />
          </TouchableOpacity>
        </View>

        {/* Divider under title */}
        <View style={[styles.divider, { backgroundColor: appColors.onboarding.signIn.divider }]} />

        {/* Main content - ScrollView for when content exceeds available space */}
        <ScrollView
          style={styles.contentWrapper}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {/* Button container with flex to center buttons */}
          <View style={styles.buttonWrapper}>
            <View style={styles.buttonContainer}>
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
                    contentFit="contain"
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
                  },
                ]}
                onPress={handleGoogleSignIn}
                activeOpacity={0.8}
              >
                <View style={styles.buttonContent}>
                  <Image
                    source={require('../../../assets/icons/google.png')}
                    style={styles.googleIcon}
                    contentFit="contain"
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
                  },
                ]}
                onPress={() => {
                  hapticFeedback.selection();
                  // Navigate immediately, then close modal
                  navigation.navigate('EmailSignIn');
                  // Close modal after a brief delay to allow navigation to start
                  setTimeout(() => {
                    handleClose(false);
                  }, 50);
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

              {/* Terms and Privacy Policy */}
              <View style={styles.termsContainer}>
                <Text style={[styles.termsText, { color: appColors.onboarding.signIn.terms.text }]}>
                  {i18n.t('termsAgreement')}{' '}
                </Text>
                <TouchableOpacity onPress={handleTermsOfServicePress}>
                  <Text
                    style={[styles.termsLink, { color: appColors.onboarding.signIn.terms.link }]}
                  >
                    {i18n.t('termsOfUse')}
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.termsText, { color: appColors.onboarding.signIn.terms.text }]}>
                  {i18n.t('and')}{' '}
                </Text>
                <TouchableOpacity onPress={handlePrivacyPolicyPress}>
                  <Text
                    style={[styles.termsLink, { color: appColors.onboarding.signIn.terms.link }]}
                  >
                    {i18n.t('privacyPolicy')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Custom loading overlay for modal only */}
        {isSigningIn && (
          <View
            style={[
              styles.modalLoadingOverlay,
              { backgroundColor: appColors.onboarding.signIn.loading.background },
            ]}
          >
            <View
              style={[
                styles.modalLoadingContainer,
                { backgroundColor: appColors.onboarding.signIn.loading.container },
              ]}
            >
              <ActivityIndicator
                size="large"
                color={appColors.onboarding.signIn.loading.indicator}
              />
            </View>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  overlayBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent', // Invisible overlay for tap detection
  },
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: screenHeight * 0.5,
    backgroundColor: appColors.onboarding.signIn.background,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20,
    paddingRight: 20,
    paddingVertical: 10,
    height: 70,
  },
  headerSpacer: {
    width: 32,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 38,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    flex: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 24,
    backgroundColor: 'none',
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 0.3,
    width: '100%',
  },
  contentWrapper: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  buttonWrapper: {
    justifyContent: 'center',
    minHeight: '100%',
  },
  buttonContainer: {
    gap: 16,
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
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
    borderWidth: 1,
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
    marginBottom: 24,
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
  modalLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  modalLoadingContainer: {
    width: 85,
    height: 85,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
