import { Redirect, useRouter } from 'expo-router';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { useThemePreference, useAuthSessionStore, useAppInitStore } from '@/stores';
import { useBiometricStore } from '@/stores/useBiometricStore';
import { useEffect, useRef } from 'react';

export default function Index() {
  const { isAuthenticated, isReady } = useAuth();
  const { colors: themeColors } = useThemePreference();
  const router = useRouter();
  const hasNavigated = useRef(false);
  const isAppReady = useAppInitStore((state) => state.isAppReady);

  console.log('🔵 [Index] Auth state:', { isAuthenticated, isReady, isAppReady });

  // Use effect to handle navigation after mount
  useEffect(() => {
    // Wait for app to be fully ready (session + profile initialized)
    if (!isAppReady || hasNavigated.current) {
      return;
    }

    const checkBiometricAndNavigate = async () => {
      hasNavigated.current = true;

      console.log('🔵 [Index] checkBiometricAndNavigate - isAuthenticated:', isAuthenticated);

      if (isAuthenticated) {
        // Check if biometric is enabled for this user
        const userId = useAuthSessionStore.getState().userId;
        console.log('🔵 [Index] userId from store:', userId);

        if (userId) {
          const biometricEnabled = await useBiometricStore.getState().isBiometricEnabledForUser(userId);
          console.log('🔵 [Index] biometricEnabled for user:', biometricEnabled);

          if (biometricEnabled) {
            console.log('🔐 [Index] Biometric enabled, navigating to /biometric-lock');
            router.replace('/biometric-lock');
            return;
          }
        }
        console.log('🟢 [Index] User authenticated, navigating to /(tabs)');
        router.replace('/(tabs)');
      } else {
        console.log('🔵 [Index] No authentication, navigating to /welcome');
        router.replace('/welcome');
      }
    };

    // Small delay to ensure everything is settled
    const timer = setTimeout(checkBiometricAndNavigate, 50);

    return () => clearTimeout(timer);
  }, [isAppReady, isAuthenticated, router]);

  // Show loading spinner
  console.log('🔵 [Index] Showing loading spinner');
  return (
    <View style={[styles.container, { backgroundColor: themeColors.backgroundPrimary }]}>
      <ActivityIndicator size="large" color={themeColors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
