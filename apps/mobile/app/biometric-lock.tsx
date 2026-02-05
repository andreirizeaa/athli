import { useEffect } from 'react';
import { useRouter } from 'expo-router';

import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { useBiometricStore } from '@/stores/useBiometricStore';
import { useCoachProfileStore } from '@/stores/useCoachProfileStore';
import { useClientProfileStore } from '@/stores/useClientProfileStore';
import { signOut } from '@/services/auth/supabase-auth';

export default function BiometricLockScreen() {
  const router = useRouter();
  const authenticateWithBiometric = useBiometricStore((s) => s.authenticateWithBiometric);

  const handleAuthenticate = async () => {
    const result = await authenticateWithBiometric();

    if (result.success) {
      router.replace('/(tabs)');
    } else {
      // If biometric fails, try again or logout
      // Give user another chance
      const retryResult = await authenticateWithBiometric();
      if (retryResult.success) {
        router.replace('/(tabs)');
      } else {
        // After second failure, logout
        await signOut();
        await useBiometricStore.getState().disableBiometric();
        useCoachProfileStore.getState().clearProfile();
        useClientProfileStore.getState().clearProfile();
        router.replace('/welcome');
      }
    }
  };

  // Auto-trigger biometric on mount
  useEffect(() => {
    handleAuthenticate();
  }, []);

  // Empty screen with same background as tabs
  return (
    <ScreenWrapper scrollable={false} hideStatusBarBlur>
      {null}
    </ScreenWrapper>
  );
}
