import { useMemo } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { CoachProfile } from '@/types/profile';
import { useAuthSessionStore } from '@/stores/useAuthSessionStore';
import { useCoachProfileStore } from '@/stores/useCoachProfileStore';
import { useClientProfileStore } from '@/stores/useClientProfileStore';

type AuthState = {
  // Session state
  session: Session | null;
  userId: string | null;
  isSessionReady: boolean;
  isInitializing: boolean;

  // Profile state
  coachProfile: CoachProfile | null;
  clientProfile: any | null; // TODO: Add proper ClientProfile type

  // Computed states
  isAuthenticated: boolean;
  isReady: boolean; // Both session AND profile are ready
  userType: 'coach' | 'client' | null;
};

/**
 * Unified auth hook that combines session and profile state
 *
 * Returns comprehensive auth state including:
 * - Session readiness (Supabase session loaded)
 * - Profile data (coach or client)
 * - Computed flags for easy conditional rendering
 *
 * Usage:
 * ```tsx
 * const { isAuthenticated, isReady, coachProfile } = useAuth();
 *
 * // Use in queries
 * enabled: isAuthenticated && isReady
 *
 * // Use in conditions
 * if (!isReady) return <Loading />;
 * ```
 */
export function useAuth(): AuthState {
  // Session state from session store
  const {
    session,
    userId,
    isSessionReady,
    isInitializing,
  } = useAuthSessionStore();

  // Profile state from profile stores
  const coachProfile = useCoachProfileStore((state) => state.profile);
  const clientProfile = useClientProfileStore((state) => state.profile);

  // Compute derived states
  const authState = useMemo(() => {
    // User has a profile (coach or client)
    const hasProfile = !!(coachProfile || clientProfile);

    // Determine user type
    const userType: 'coach' | 'client' | null = coachProfile ? 'coach' : clientProfile ? 'client' : null;

    // User is authenticated if they have both session and profile
    const isAuthenticated = isSessionReady && hasProfile;

    // App is ready when not initializing and either authenticated or confirmed not authenticated
    const isReady = !isInitializing && isSessionReady;

    return {
      session,
      userId,
      isSessionReady,
      isInitializing,
      coachProfile,
      clientProfile,
      isAuthenticated,
      isReady,
      userType,
    };
  }, [
    session,
    userId,
    isSessionReady,
    isInitializing,
    coachProfile,
    clientProfile,
  ]);

  return authState;
}
