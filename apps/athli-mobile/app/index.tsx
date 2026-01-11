import { Redirect } from 'expo-router';
import { useCoachProfileStore, useClientProfileStore } from '@/stores';

export default function Index() {
  const coachProfile = useCoachProfileStore((state) => state.profile);
  const clientProfile = useClientProfileStore((state) => state.profile);

  console.log('🔵 [Index] Checking authentication state...');
  console.log('🔵 [Index] Coach profile:', coachProfile?.id);
  console.log('🔵 [Index] Client profile:', clientProfile?.id);

  // If user is authenticated (has a profile), go to main app
  if (coachProfile || clientProfile) {
    console.log('🟢 [Index] User authenticated, redirecting to /(tabs)');
    return <Redirect href="/(tabs)" />;
  }

  // Otherwise, show welcome screen
  console.log('🔵 [Index] No authentication, redirecting to /welcome');
  return <Redirect href="/welcome" />;
}
