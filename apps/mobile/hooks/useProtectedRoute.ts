import { useEffect } from 'react';
import { useSegments, useRouter } from 'expo-router';
import { useAuthSessionStore } from '@/stores/useAuthSessionStore';
import { useCoachProfileStore } from '@/stores/useCoachProfileStore';
import { useClientProfileStore } from '@/stores/useClientProfileStore';

/**
 * Protects routes from unauthenticated access (e.g., deep links).
 *
 * - Waits for session initialization before redirecting
 * - Public segments: index, welcome, auth, biometric-lock, modals/auth
 * - Unauthenticated users on protected routes → /welcome
 * - Authenticated users on /welcome → /(tabs)
 */
export function useProtectedRoute() {
  const segments = useSegments();
  const router = useRouter();

  const isSessionReady = useAuthSessionStore((s) => s.isSessionReady);
  const session = useAuthSessionStore((s) => s.session);
  const coachProfile = useCoachProfileStore((s) => s.profile);
  const clientProfile = useClientProfileStore((s) => s.profile);

  useEffect(() => {
    if (!isSessionReady) return;

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
  }, [isSessionReady, session, coachProfile, clientProfile, segments, router]);
}
