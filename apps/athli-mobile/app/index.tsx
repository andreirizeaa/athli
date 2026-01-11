import { Redirect } from 'expo-router';
import { getStoredUserId } from '@/services/auth/supabase-auth';

export default function Index() {
  const userId = getStoredUserId();

  console.log('🔵 [Index] Checking authentication state...');
  console.log('🔵 [Index] Stored user ID:', userId);

  // If user is authenticated (has a stored user ID), go to main app
  if (userId) {
    console.log('🟢 [Index] User authenticated, redirecting to /(tabs)');
    return <Redirect href="/(tabs)" />;
  }

  // Otherwise, show welcome screen
  console.log('🔵 [Index] No authentication, redirecting to /welcome');
  return <Redirect href="/welcome" />;
}
