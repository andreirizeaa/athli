import { Redirect, useRouter } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { useThemePreference } from '@/stores';
import { useEffect, useRef } from 'react';
import { SkeletonList } from '@/components/ui/skeleton-list';

export default function Index() {
  const { isAuthenticated, isReady } = useAuth();
  const { colors: themeColors } = useThemePreference();
  const router = useRouter();
  const hasNavigated = useRef(false);

  console.log('🔵 [Index] Auth state:', { isAuthenticated, isReady });

  // Use effect to handle navigation after mount
  useEffect(() => {
    // Wait for auth to be ready (session initialized)
    if (!isReady || hasNavigated.current) {
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
  }, [isReady, isAuthenticated, router]);

  // Show skeleton loading
  console.log('🔵 [Index] Showing skeleton loading');
  return (
    <View style={[styles.container, { backgroundColor: themeColors.backgroundPrimary }]}>
      <SkeletonList />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
