import { NavigationContainer, useNavigation, useRoute } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import React from 'react';

// Import screens
import { useOnboarding } from '../context/OnboardingContext';
import { usePurchases } from '../context/PurchasesContext';
import { useUserDetails } from '../context/UserDetailsContext';
import { EmailSignIn } from '../screens/auth/EmailSignIn';
import { AccountLoadingScreen } from '../screens/onboarding/AccountLoadingScreen';
import { NotificationPermissionScreen } from '../screens/onboarding/NotificationPermissionScreen';
import { OnboardingUnifiedScreen } from '../screens/onboarding/OnboardingUnifiedScreen';
import { WelcomeScreen } from '../screens/onboarding/WelcomeScreen';
import { PaymentScreen } from '../screens/payment/PaymentScreen';
import { showAlert } from '../services/alertService';
import { track } from '../services/analytics';
import { registerAndSaveExpoPushToken } from '../services/push';
import { removeUserId, setUserId } from '../services/storageService';
import { fetchUserById, requiresOnboarding } from '../services/userService';
import i18n from '../utils/i18n';

interface OnboardingNavigatorProps {
  onComplete: () => void;
  onSignIn: () => void;
  onUserNeedsOnboarding: () => void;
  initialRouteName?: 'Welcome' | 'Payment';
  isAppVisible?: boolean;
}

export type OnboardingStackParamList = {
  Welcome: undefined;
  Onboarding: undefined;
  NotificationPermission: undefined;
  AccountLoading: undefined;
  Payment: undefined;
  AllDone: undefined;
  EmailSignIn: undefined;
};

export type OnboardingNavigationProp = NativeStackNavigationProp<OnboardingStackParamList>;

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

// Wrapper components that handle navigation

function WelcomeScreenWrapper({
  onSignIn,
  isAppVisible,
}: {
  onSignIn: () => void;
  isAppVisible?: boolean;
}) {
  const navigation = useNavigation<OnboardingNavigationProp>();

  const handleGetStarted = () => {
    navigation.navigate('Onboarding');
  };

  const handleNavigateToOnboarding = () => {
    navigation.navigate('Onboarding');
  };

  const handleRequirePayment = () => {
    navigation.navigate('Payment');
  };

  return (
    <WelcomeScreen
      onGetStarted={handleGetStarted}
      onSignIn={onSignIn}
      onNavigateToOnboarding={handleNavigateToOnboarding}
      onRequirePayment={handleRequirePayment}
      isAppVisible={isAppVisible}
    />
  );
}

function UnifiedOnboardingScreenWrapper() {
  return <OnboardingUnifiedScreen />;
}

function PaymentScreenWrapper() {
  const navigation = useNavigation<OnboardingNavigationProp>();

  return (
    <PaymentScreen
      onComplete={() => {
        // After payment completion, go to account loading
        navigation.navigate('AccountLoading');
      }}
    />
  );
}

function NotificationPermissionScreenWrapper() {
  const navigation = useNavigation<OnboardingNavigationProp>();

  const handleNext = () => {
    navigation.navigate('AccountLoading');
  };

  const handleBack = () => {
    navigation.navigate('Onboarding');
  };

  return <NotificationPermissionScreen onNext={handleNext} onBack={handleBack} />;
}

function AccountLoadingScreenWrapper({ onComplete }: { onComplete: () => void }) {
  const navigation = useNavigation<OnboardingNavigationProp>();
  const { hasSubscription, refreshCustomerInfo } = usePurchases();
  const { refetchUserDetails } = useUserDetails();
  const isRunningRef = React.useRef(false);

  const handleNext = async () => {
    if (isRunningRef.current) return; // guard against double-taps
    isRunningRef.current = true;

    await refreshCustomerInfo().catch(() => {});
    if (!hasSubscription) {
      navigation.navigate('Payment');
    } else {
      await refetchUserDetails(); // ensure context is populated, silently
      onComplete(); // this triggers your fade to MainAppLayout
    }

    isRunningRef.current = false;
  };

  return <AccountLoadingScreen onComplete={handleNext} />;
}

function EmailSignInScreenWrapper() {
  const navigation = useNavigation<OnboardingNavigationProp>();
  const route = useRoute<any>();
  const mode: 'signIn' | 'signUp' = route.params?.mode === 'signUp' ? 'signUp' : 'signIn';
  const { logIn } = usePurchases();
  const { onboardingData, updateOnboardingData } = useOnboarding();

  const handleVerified = async (userId: string, onComplete?: () => void) => {
    if (mode === 'signIn') {
      try {
        updateOnboardingData('userId', userId);
        await setUserId(userId);
        const { user } = await fetchUserById(userId);
        if (!user) {
          await removeUserId();
          showAlert(
            i18n.t('onboarding.incompleteAccount.title'),
            i18n.t('onboarding.incompleteAccount.message'),
            () => {
              navigation.navigate('Onboarding');
              // Reset to email step and stop loading after navigation
              onComplete?.();
            }
          );
          // Don't call onComplete here - wait for alert callback
          return;
        }
        await logIn(userId);
        track('Sign In Completed', { user_id: userId });
        await registerAndSaveExpoPushToken(userId);
        if (requiresOnboarding(user)) {
          await removeUserId();
          showAlert(
            i18n.t('onboarding.incompleteAccount.title'),
            i18n.t('onboarding.incompleteAccount.message'),
            () => {
              navigation.navigate('Onboarding');
              // Reset to email step and stop loading after navigation
              onComplete?.();
            }
          );
          // Don't call onComplete here - wait for alert callback
          return;
        }
        navigation.navigate('AccountLoading');
        // Reset to email step and stop loading after successful navigation
        onComplete?.();
      } catch {
        navigation.navigate('AccountLoading');
        // Reset to email step after navigation
        onComplete?.();
      }
      return;
    }

    // Sign-Up flow (replicates CreateAccountScreen behavior)
    try {
      await setUserId(userId);
      const { user: existingUser } = await fetchUserById(userId);
      if (existingUser) {
        await logIn(userId);
        track('Sign In Completed', { signin_method: 'email', user_id: userId });
        try {
          await registerAndSaveExpoPushToken(userId);
        } catch {}
        navigation.navigate('AccountLoading');
        // Reset to email step after navigation
        onComplete?.();
        return;
      }

      const profilePicture: string | null = null;
      const updatedData = {
        ...onboardingData,
        signInMethod: 'email',
        onboardingCompleted: true,
        walkthroughCompleted: false,
        userId: userId,
        profilePicture,
      };

      updateOnboardingData('signInMethod', 'email');
      updateOnboardingData('onboardingCompleted', true);
      updateOnboardingData('walkthroughCompleted', false);
      updateOnboardingData('userId', userId);
      updateOnboardingData('profilePicture', profilePicture);

      await logIn(userId);
      track('Signup Completed', { signup_method: 'email', user_id: userId });
      try {
        await registerAndSaveExpoPushToken(userId);
        const { saveOnboardingProgress } = await import('../services/onboardingService');
        await saveOnboardingProgress(updatedData);
      } catch {}
      navigation.navigate('AccountLoading');
      // Reset to email step after navigation
      onComplete?.();
    } catch {
      navigation.navigate('AccountLoading');
      // Reset to email step after navigation
      onComplete?.();
    }
  };

  return (
    <EmailSignIn mode={mode} onBack={() => navigation.goBack()} onVerifiedUserId={handleVerified} />
  );
}

export function OnboardingNavigator({
  onComplete,
  onSignIn,
  onUserNeedsOnboarding,
  initialRouteName = 'Welcome',
  isAppVisible = false,
}: OnboardingNavigatorProps) {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRouteName}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Welcome">
          {() => <WelcomeScreenWrapper onSignIn={onSignIn} isAppVisible={isAppVisible} />}
        </Stack.Screen>

        <Stack.Screen name="Onboarding">{() => <UnifiedOnboardingScreenWrapper />}</Stack.Screen>

        <Stack.Screen name="NotificationPermission">
          {() => <NotificationPermissionScreenWrapper />}
        </Stack.Screen>

        <Stack.Screen name="AccountLoading">
          {() => <AccountLoadingScreenWrapper onComplete={onComplete} />}
        </Stack.Screen>

        <Stack.Screen name="Payment">{() => <PaymentScreenWrapper />}</Stack.Screen>
        <Stack.Screen name="EmailSignIn">{() => <EmailSignInScreenWrapper />}</Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
