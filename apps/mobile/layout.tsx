import React, { useEffect, useState, useRef } from 'react';
import { View, InteractionManager } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { Asset } from 'expo-asset';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initializeSyncService, startSyncService, stopSyncService } from './src/services/syncService';
import { useQuickActionCallback } from 'expo-quick-actions/hooks';
import { openDeletionFeedbackEmail } from './src/services/emailService';
import { track } from './src/services/analytics';
import { LoadingLiftsProvider } from './src/context/LoadingLiftsContext';
import { LiftDataProvider } from './src/context/LiftDataContext';
import { UserDetailsProvider } from './src/context/UserDetailsContext';
import { OnboardingNavigator } from './src/navigation/OnboardingNavigator';
import { MainAppLayout } from './src/components/layout/MainAppLayout';
import { UserCheckInsProvider } from './src/context/UserCheckInsContext';
import { SelectedDateProvider } from './src/context/SelectedDateContext';
import { supabase, setGlobalAuthErrorHandler } from './src/lib/supabase';
import { getUserId, removeUserId, setUserId } from './src/services/storageService';
import { handleAuthError } from './src/services/authErrorService';
import { AccountLoadingScreen } from './src/screens/onboarding/AccountLoadingScreen';
import { fetchUserById, requiresOnboarding } from './src/services/userService';
import { usePurchases, PurchasesProvider } from './src/context/PurchasesContext';
import { SuperwallProvider } from './src/context/SuperwallContext';
import { useUserDetails } from './src/context/UserDetailsContext';
import { useLiftData } from './src/context/LiftDataContext';
import { useUserCheckIns } from './src/context/UserCheckInsContext';
import { showAlert } from './src/services/alertService';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AppRoute = 'SPLASH' | 'ONBOARDING_WELCOME' | 'ONBOARDING_PAYMENT' | 'ACCOUNT_LOADING' | 'MAIN';

// Keep splash screen visible until we explicitly hide it
SplashScreen.preventAutoHideAsync().catch(() => {});

// Component that can access context providers to check loading states
function AppContent() {
  const [route, setRoute] = useState<AppRoute>('SPLASH');
  const [isLoading, setIsLoading] = useState(true);
  const [appReady, setAppReady] = useState(false);
  const [contentReady, setContentReady] = useState(false);
  const [routingDecided, setRoutingDecided] = useState(false);
  const [passedInitialDataGate, setPassedInitialDataGate] = useState(false);
  const [splashHidden, setSplashHidden] = useState(false);
  
  // Ref to prevent multiple email composer calls
  const emailComposerCalled = useRef(false);

  // Handle quick actions using the hook
  useQuickActionCallback((action) => {
    if (action?.id === 'deletion_feedback' && !emailComposerCalled.current) {
      emailComposerCalled.current = true;
      
      // Track the quick action event
      track('Feedback quick action', {
        event: 'Quick action triggered',
        action_id: 'deletion_feedback',
        source: 'ios_quick_action'
      });
      
      openDeletionFeedbackEmail();
    }
  });

  const { hasSubscription, isInitializing } = usePurchases();
  const { isUserDetailsLoaded, refetchUserDetails, userDetails, setSignedInUser: setUserDetailsSignedInUser } = useUserDetails();
  const { isLiftDataLoaded, liftData, setSignedInUser: setLiftDataSignedInUser } = useLiftData();
  const { 
    isLoading: isUserCheckInsLoading, 
    data: checkIns, 
    refetch: refetchUserCheckIns,
    setSignedInUser: setCheckInsSignedInUser
  } = useUserCheckIns();

  // Centralized data gate check - single source of truth
  const contextsReady =
    isUserDetailsLoaded &&
    isLiftDataLoaded &&
    !isUserCheckInsLoading &&
    userDetails != null &&
    liftData != null &&
    checkIns != null;

  // Hide splash screen when content is ready
  useEffect(() => {
    if (!contentReady) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(async () => {
        try {
          await SplashScreen.hideAsync();
        } catch {}
        // Mark app visible to the user
        setSplashHidden(true);
      });
    });
  }, [contentReady]);

  // Asset preloading effect - defer heavy assets until after first interactions
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(async () => {
      try {
        const assetsToLoad = [
          require('./assets/formai-homescreen.mp4'),
          require('./assets/recording-tip.png'),
          require('./assets/formai-loading.png'),
          require('./assets/icons/instagram.png'),
          require('./assets/icons/tiktok.png'),
          require('./assets/icons/facebook.png'),
          require('./assets/icons/google.png'),
          require('./assets/icons/apple.png'),
          require('./assets/icons/fire.png'),
          require('./assets/icons/appstore.png'),
          require('./assets/icons/playstore.png'),
          require('./assets/icons/x.png'),
          require('./assets/tutorial/formai-example-feedback.png'),
          require('./assets/tutorial/formai-example-pose.mp4'),
          require('./assets/tutorial/formai-example-video-thumbnail.jpg'),
          require('./assets/tutorial/formai-example-video.mp4'),
          require('./assets/onboarding/progress_tracking.png'),
          require('./assets/formai-payment-screen.png'),
        ].filter(asset => {
          // Filter out any assets that might be objects instead of module references
          if (typeof asset === 'object' && asset !== null && !asset.uri && !asset.__packager_asset) {
            console.warn('Skipping invalid asset (likely JSON):', asset);
            return false;
          }
          return true;
        });

        await Asset.loadAsync(assetsToLoad);
      } catch (error) {
        console.warn('Asset preloading failed:', error);
      }
    });
    return () => task.cancel();
  }, []);

  // Set routing decided when route is determined
  useEffect(() => {
    if (route !== 'SPLASH') setRoutingDecided(true);
  }, [route]);

  useEffect(() => {
    async function setActiveLayout() {
      try {
        if (isInitializing === true || isInitializing === undefined) return;

        const storedUserId = await getUserId();
        if (!storedUserId) {
          setRoute('ONBOARDING_WELCOME');
          return;
        }

        let user;
        try {
          const result = await fetchUserById(storedUserId);
          user = result.user;
          if (!user) {
            setRoute('ONBOARDING_WELCOME');
            return;
          }
        } catch (error) {
          // Handle auth errors gracefully
          await handleAuthError(supabase, error, () => setRoute('ONBOARDING_WELCOME'));
          setRoute('ONBOARDING_WELCOME');
          return;
        }

        if (requiresOnboarding(user)) {
          setRoute('ONBOARDING_WELCOME');
          return;
        }
        if (!hasSubscription) {
          setRoute('ONBOARDING_PAYMENT');
          return;
        }

        goToMainGated();
      } catch {
        setRoute('ONBOARDING_WELCOME');
      } finally {
        setIsLoading(false);
      }
    }

    setActiveLayout();
  }, [hasSubscription, isInitializing]);


  // Set sticky data gate once per app session - wait for RevenueCat + initial data
  useEffect(() => {
    if (!passedInitialDataGate && !isInitializing && contextsReady) {
      setPassedInitialDataGate(true);
    }
  }, [passedInitialDataGate, isInitializing, contextsReady]);

  // Set app ready when all conditions are met (don't wait for assets)
  // For onboarding routes, ready immediately. For MAIN, wait for data gate.
  useEffect(() => {
    const isOnboardingRoute =
      route === 'ONBOARDING_WELCOME' ||
      route === 'ONBOARDING_PAYMENT' ||
      route === 'ACCOUNT_LOADING';

    if (isOnboardingRoute) {
      setAppReady(true); // ready immediately
      return;
    }

    // MAIN requires data gate *every time* we land on MAIN
    setAppReady(!isLoading && contextsReady);
  }, [route, isLoading, contextsReady]);

  // Set content ready when app is ready and routing is decided
  // For onboarding routes, use routingDecided. For MAIN, use appReady.
  useEffect(() => {
    const needsDataGate = route === 'MAIN';
    const canShow = needsDataGate ? appReady : routingDecided;
    if (canShow) {
      const timer = setTimeout(() => setContentReady(true), 150);
      return () => clearTimeout(timer);
    } else {
      // Important when bouncing back to MAIN to re-apply gate
      setContentReady(false);
    }
  }, [route, appReady, routingDecided]);

  // Ensure splash can hide quickly for non-MAIN routes
  useEffect(() => {
    if (route !== 'MAIN' && routingDecided) {
      setAppReady(true); // harmless if already true
    }
  }, [route, routingDecided]);

  // Force re-gate on every MAIN transition
  const goToMainGated = () => {
    setAppReady(false);
    setContentReady(false);
    setRoute('MAIN');
  };


  const handleOnboardingComplete = () => {
    goToMainGated();
  };
  const handleSignIn = () => setRoute('ACCOUNT_LOADING');
  const handlePaymentComplete = () => handleOnboardingComplete();

  const handleAccountLoadingComplete = async () => {
    // Make sure providers *know* the userId immediately
    const id = await getUserId().catch(() => null);
    if (id) {
      // Set the user ID in all contexts immediately
      try { 
        setUserDetailsSignedInUser?.(id); 
      } catch {}
      try { 
        setCheckInsSignedInUser?.(id); 
      } catch {}
      try {
        setLiftDataSignedInUser?.(id);
      } catch {}
    }
    
    // Now refetch all contexts
    await Promise.all([
      refetchUserDetails(),
      refetchUserCheckIns ? refetchUserCheckIns() : Promise.resolve(),
    ]);
    goToMainGated();            // land on MAIN but still wait for contextsReady
  };

  const handleUserNeedsOnboarding = () => setRoute('ONBOARDING_WELCOME');

  // Set up global auth error handler
  useEffect(() => {
    setGlobalAuthErrorHandler(() => {
      setRoute('ONBOARDING_WELCOME');
    });
  }, []);

  const handleLogout = async () => {
    try {
      // Set route to onboarding immediately to prevent AccountLoadingScreen from showing
      setRoute('ONBOARDING_WELCOME');

      // Reset loading states immediately
      setIsLoading(true);
      setAppReady(false);
      setContentReady(false);
      setRoutingDecided(false);
      setPassedInitialDataGate(false);

      if ((global as any).resetUserDetailsContext) {
        (global as any).resetUserDetailsContext();
      }
      await supabase.auth.signOut();
      await removeUserId();
    } catch (error) {
      showAlert(
        'Logout Error',
        'An error occurred during logout. Please try again.',
        undefined,
        'LAYOUT_LOGOUT_ERROR',
        error
      );
    }
  };

  // Single switch statement for rendering based on route
  const renderContent = () => {
    switch (route) {
      case 'SPLASH':
        return null; // Let splash screen handle this
      case 'ONBOARDING_WELCOME':
        return (
          <OnboardingNavigator
            onComplete={handlePaymentComplete}
            onSignIn={handleSignIn}
            onUserNeedsOnboarding={handleUserNeedsOnboarding}
            initialRouteName="Welcome"
            isAppVisible={splashHidden}
          />
        );
      case 'ONBOARDING_PAYMENT':
        return (
          <OnboardingNavigator
            onComplete={handlePaymentComplete}
            onSignIn={handleSignIn}
            onUserNeedsOnboarding={handleUserNeedsOnboarding}
            initialRouteName="Payment"
            isAppVisible={splashHidden}
          />
        );
      case 'ACCOUNT_LOADING':
        return (
          <SafeAreaProvider>
            <AccountLoadingScreen onComplete={handleAccountLoadingComplete} />
          </SafeAreaProvider>
        );
      case 'MAIN': {
        if (!contextsReady) {
          return (
            <SafeAreaProvider>
              <AccountLoadingScreen onComplete={handleAccountLoadingComplete} />
            </SafeAreaProvider>
          );
        }

        return <MainAppLayout onLogout={handleLogout} isAppVisible={splashHidden} />;
      }
      default:
        return null;
    }
  };

  return (
    <View
      style={{
        flex: 1,
        // Match native splash background to avoid flash during transition
        backgroundColor: '#ffffff',
      }}
    >
      <View style={{ flex: 1 }}>
        {renderContent()}
      </View>
    </View>
  );
}

export function Layout() {
  const queryClientRef = React.useRef<QueryClient | null>(null);
  if (!queryClientRef.current) {
    queryClientRef.current = new QueryClient();
  }

  // Initialize sync service
  React.useEffect(() => {
    if (queryClientRef.current) {
      initializeSyncService(queryClientRef.current);
      startSyncService();
    }

    return () => {
      stopSyncService();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClientRef.current}>
          <UserDetailsProvider>
            <LiftDataProvider>
              <UserCheckInsProvider>
                <SelectedDateProvider>
                  <LoadingLiftsProvider>
                    <AppContent />
                  </LoadingLiftsProvider>
                </SelectedDateProvider>
              </UserCheckInsProvider>
            </LiftDataProvider>
          </UserDetailsProvider>
    </QueryClientProvider>
  );
}
