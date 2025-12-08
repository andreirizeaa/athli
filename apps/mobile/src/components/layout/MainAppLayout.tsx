import React from 'react';
import { Animated, AppState, AppStateStatus } from 'react-native';
import { MainAppNavigator } from '../../navigation/MainAppNavigator';
import { useUserDetails } from '../../context/UserDetailsContext';
import { WelcomeModal } from '../../screens/application/settings/WelcomeModal';
import { TutorialProvider, useTutorial } from '../../context/TutorialContext';
import { TutorialLiftSeeder } from '../../context/LiftDataContext';
import { TutorialOverlay } from '../ui/overlays/TutorialOverlay';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface MainAppLayoutProps {
  children?: React.ReactNode;
  isNewUser?: boolean;
  isAppVisible?: boolean; // controls showing UI after splash
}

/** Wrapper so we can use the tutorial hook for the WelcomeModal button */
export function MainAppLayout(props: MainAppLayoutProps) {
  return (
    <TutorialProvider>
      <MainAppLayoutInner {...props} />
    </TutorialProvider>
  );
}

function MainAppLayoutInner({ isAppVisible = false }: MainAppLayoutProps) {
  const { userDetails } = useUserDetails();
  const tutorial = useTutorial();

  const [showWelcome, setShowWelcome] = React.useState(false);
  const [isVersionCheckCleared, setIsVersionCheckCleared] = React.useState(false);

  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  // Clear version check time on fresh app start - must complete before MainAppNavigator renders
  React.useEffect(() => {
    const clearVersionCheckTime = async () => {
      try {
        await AsyncStorage.removeItem('last_version_check_time');
        setIsVersionCheckCleared(true);
      } catch (error) {
        // Silent fail - not critical if this fails
        setIsVersionCheckCleared(true);
      }
    };

    clearVersionCheckTime();
  }, []);

  // Fade in animation (kept, unrelated to welcome gating)
  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // ✅ Render WelcomeModal only if walkthrough is not completed AND app is visible (splash hidden)
  React.useEffect(() => {
    if (!userDetails) return;
    const shouldShow = userDetails.walkthroughCompleted === false && isAppVisible === true;
    setShowWelcome(shouldShow);
  }, [userDetails, isAppVisible]);


  // 🚀 Start tutorial ONLY when user taps "Get Started"
  const handleGetStarted = () => {
    setShowWelcome(false);
    try {
      tutorial.start();
    } catch (e) {
      console.warn('Error starting tutorial:', e);
    }
  };

  const handleAddPress = () => {
    // Always allow adding - no subscription check
    return false;
  };


  // Don't render MainAppNavigator until version check time is cleared
  if (!isVersionCheckCleared) {
    return null;
  }

  return (
    <>
      {/* Modal only shows after splash via isAppVisible gating */}
      <WelcomeModal isVisible={showWelcome} onGetStarted={handleGetStarted} />

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <MainAppNavigator onAddPress={handleAddPress} />
      </Animated.View>

      {/* Tutorial always available; it only starts when user taps Get Started */}
      <TutorialOverlay />
      <TutorialLiftSeeder />
    </>
  );
}
