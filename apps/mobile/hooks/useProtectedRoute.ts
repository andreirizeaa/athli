import { useEffect } from 'react';
import { useSegments, useRouter } from 'expo-router';
import { useAuthSessionStore } from '@/stores/useAuthSessionStore';
import { useCoachProfileStore } from '@/stores/useCoachProfileStore';
import { useClientProfileStore } from '@/stores/useClientProfileStore';
import { useAppInitStore } from '@/stores/useAppInitStore';

/**
 * Protects routes from unauthenticated access (e.g., deep links).
 *
 * - Waits for app initialization (session + profile) before redirecting
 * - Public segments: index, welcome, auth, biometric-lock, modals/auth
 * - Unauthenticated users on protected routes → /welcome
 * - Authenticated users on /welcome → /(tabs)
 */
export function useProtectedRoute() {
  const segments = useSegments() as string[];
  const router = useRouter();

  const isAppReady = useAppInitStore((s) => s.isAppReady);
  const session = useAuthSessionStore((s) => s.session);
  const coachProfile = useCoachProfileStore((s) => s.profile);
  const clientProfile = useClientProfileStore((s) => s.profile);

  useEffect(() => {
    // Wait for app to be fully initialized before making navigation decisions
    if (!isAppReady) return;

    const firstSegment = segments[0] as string | undefined;
    const isAuthenticated = !!session && !!(coachProfile || clientProfile);

    const isPublicRoute =
      !firstSegment ||                    // index (root)
      firstSegment === '(index)' ||
      firstSegment === 'welcome' ||
      firstSegment === 'auth' ||
      firstSegment === 'biometric-lock' ||
      (firstSegment === 'modals' && segments[1] === 'auth');

    if (!isAuthenticated && !isPublicRoute) {
      router.replace('/welcome');
    } else if (isAuthenticated && firstSegment === 'welcome') {
      router.replace('/(tabs)');
    }
  }, [isAppReady, session, coachProfile, clientProfile, segments, router]);
}
