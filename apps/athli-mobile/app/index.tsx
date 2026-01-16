import { Redirect, useRouter } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { useThemePreference, useAppInitStore } from '@/stores';
import { useEffect, useRef } from 'react';

export default function Index() {
  const { isAuthenticated, isReady } = useAuth();
  const { colors: themeColors } = useThemePreference();
  const isAppReady = useAppInitStore((state) => state.isAppReady);
  const router = useRouter();
  const hasNavigated = useRef(false);

  console.log('🔵 [Index] Auth state:', { isAuthenticated, isReady, isAppReady });

  // Use effect to handle navigation after mount
  useEffect(() => {
    // Wait for both auth AND app to be ready
    if (!isReady || !isAppReady || hasNavigated.current) {
      return;
    }

    hasNavigated.current = true;

    // Small delay to ensure everything is settled
    const timer = setTimeout(() => {
      if (isAuthenticated) {
        console.log('🟢 [Index] User authenticated, navigating to /(tabs)');
        router.replace('/(tabs)');
      } else {
        console.log('🔵 [Index] No authentication, navigating to /welcome');
        router.replace('/welcome');
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [isReady, isAppReady, isAuthenticated, router]);

  // Show loading indicator
  console.log('🔵 [Index] Showing loading indicator');
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
