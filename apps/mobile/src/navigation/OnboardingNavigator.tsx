import { NavigationContainer, useNavigation, useRoute } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import React from 'react';

// Import screens
import { useOnboarding } from '../context/OnboardingContext';
import { useUserDetails } from '../context/UserDetailsContext';
import { EmailSignIn } from '../screens/auth/EmailSignIn';
import { CreateAccountScreen } from '../screens/auth/CreateAccountScreen';
import { AccountLoadingScreen } from '../screens/onboarding/AccountLoadingScreen';
import { WelcomeScreen } from '../screens/onboarding/WelcomeScreen';
import { showAlert } from '../services/alertService';
import { registerAndSaveExpoPushToken } from '../services/push';
import { removeUserId, setUserId } from '../services/storageService';
import { fetchUserById, requiresOnboarding } from '../services/userService';
import i18n from '../utils/i18n';

interface OnboardingNavigatorProps {
  onComplete: () => void;
  onSignIn: () => void;
  onUserNeedsOnboarding: () => void;
  initialRouteName?: 'Welcome';
  isAppVisible?: boolean;
}

export type OnboardingStackParamList = {
  Welcome: undefined;
  AccountLoading: undefined;
  EmailSignIn: undefined;
  CreateAccount: undefined;
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
    // Navigate to create account screen
    navigation.navigate('CreateAccount');
  };

  return (
    <WelcomeScreen
      onGetStarted={handleGetStarted}
      onSignIn={onSignIn}
      isAppVisible={isAppVisible}
    />
  );
}

function AccountLoadingScreenWrapper({ onComplete }: { onComplete: () => void }) {
  const { refetchUserDetails } = useUserDetails();
  const isRunningRef = React.useRef(false);

  const handleNext = async () => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;

    await refetchUserDetails();
    onComplete();

    isRunningRef.current = false;
  };

  return <AccountLoadingScreen onComplete={handleNext} />;
}

function EmailSignInScreenWrapper() {
  const navigation = useNavigation<OnboardingNavigationProp>();
  const route = useRoute<any>();
  const mode: 'signIn' | 'signUp' = route.params?.mode === 'signUp' ? 'signUp' : 'signIn';
  const { onboardingData, updateOnboardingData } = useOnboarding();

  const handleVerified = async (userId: string, onComplete?: () => void) => {
    if (mode === 'signIn') {
      try {
        updateOnboardingData('userId', userId);
        await setUserId(userId);
        const { user } = await fetchUserById(userId);
        if (!user || requiresOnboarding(user)) {
          await removeUserId();
          showAlert(
            i18n.t('onboarding.incompleteAccount.title'),
            i18n.t('onboarding.incompleteAccount.message'),
            () => {
              navigation.navigate('CreateAccount');
              onComplete?.();
            }
          );
          return;
        }
        await registerAndSaveExpoPushToken(userId);
        navigation.navigate('AccountLoading');
        onComplete?.();
      } catch {
        navigation.navigate('AccountLoading');
        onComplete?.();
      }
      return;
    }

    // Sign-Up flow
    try {
      await setUserId(userId);
      const { user: existingUser } = await fetchUserById(userId);
      if (existingUser) {
        try {
          await registerAndSaveExpoPushToken(userId);
        } catch {}
        navigation.navigate('AccountLoading');
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

      try {
        await registerAndSaveExpoPushToken(userId);
        const { saveOnboardingProgress } = await import('../services/onboardingService');
        await saveOnboardingProgress(updatedData);
      } catch {}
      navigation.navigate('AccountLoading');
      onComplete?.();
    } catch {
      navigation.navigate('AccountLoading');
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

        <Stack.Screen name="AccountLoading">
          {() => <AccountLoadingScreenWrapper onComplete={onComplete} />}
        </Stack.Screen>

        <Stack.Screen name="EmailSignIn">{() => <EmailSignInScreenWrapper />}</Stack.Screen>
        
        <Stack.Screen name="CreateAccount">
          {() => {
            const nav = useNavigation<OnboardingNavigationProp>();
            return (
              <CreateAccountScreen
                onNext={() => nav.navigate('AccountLoading')}
                onBack={() => nav.goBack()}
              />
            );
          }}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
