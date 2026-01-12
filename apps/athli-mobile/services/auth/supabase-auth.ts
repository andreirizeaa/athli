import { supabase } from '@/lib/supabase';
import { Storage } from '@/lib/storage';
import { signInWithGoogle } from './google-auth';
import { signInWithApple } from './apple-auth';
import { signInWithEmail } from './email-auth';
import { validateUserProfile } from './profile-validation';
import type { AuthResult } from '@/types/profile';

const USER_ID_KEY = 'athli_user_id';
const PROFILE_TYPE_KEY = 'athli_profile_type';

export type AuthProvider = 'google' | 'apple' | 'email';

export interface AuthError {
  message: string;
  code?: string;
}

/**
 * Main auth orchestrator that handles sign-in flow
 * 1. Authenticate with provider
 * 2. Validate user has a profile
 * 3. Store user ID and profile type
 * 4. Return profile info
 */
export async function authenticateUser(
  provider: AuthProvider,
  emailCredentials?: { email: string; password: string }
): Promise<AuthResult> {
  try {
    console.log(`🔵 [Auth Orchestrator] Starting authentication with provider: ${provider}`);
    let userId: string = '';
    let error: string | undefined;

    // Step 1: Authenticate with provider
    console.log('🔵 [Auth Orchestrator] Step 1: Authenticating with provider...');
    switch (provider) {
      case 'google':
        const googleResult = await signInWithGoogle();
        userId = googleResult.userId;
        error = googleResult.error;
        console.log('🔵 [Auth Orchestrator] Google result - userId:', userId, 'error:', error);
        break;
      case 'apple':
        const appleResult = await signInWithApple();
        userId = appleResult.userId;
        error = appleResult.error;
        console.log('🔵 [Auth Orchestrator] Apple result - userId:', userId, 'error:', error);
        break;
      case 'email':
        if (!emailCredentials) {
          throw new Error('Email credentials are required');
        }
        const emailResult = await signInWithEmail(
          emailCredentials.email,
          emailCredentials.password
        );
        userId = emailResult.userId;
        error = emailResult.error;
        console.log('🔵 [Auth Orchestrator] Email result - userId:', userId, 'error:', error);
        break;
      default:
        throw new Error('Invalid auth provider');
    }

    if (error || !userId) {
      console.log('🔴 [Auth Orchestrator] Authentication failed:', error || 'No user ID');
      // Check if this is a user cancellation
      const isCancelled = error?.includes('cancelled') || error?.includes('canceled');
      if (isCancelled) {
        // Throw with the original cancellation message so it can be detected upstream
        throw new Error(error);
      }
      throw new Error(error || 'Authentication failed');
    }

    // Step 2: Validate user has a profile
    console.log('🔵 [Auth Orchestrator] Step 2: Validating user profile for userId:', userId);
    const profileResult = await validateUserProfile(userId);
    console.log('🔵 [Auth Orchestrator] Profile validation result:', {
      profileType: profileResult.profileType,
      hasProfile: !!profileResult.profile
    });

    if (!profileResult.profileType || !profileResult.profile) {
      console.error('🔴 [Auth Orchestrator] No profile found for user');
      throw new Error('NO_PROFILE_FOUND');
    }

    // Step 3: Store user ID and profile type in storage
    console.log('🔵 [Auth Orchestrator] Step 3: Storing user data in storage...');
    Storage.setItem(USER_ID_KEY, userId);
    Storage.setItem(PROFILE_TYPE_KEY, profileResult.profileType);
    console.log('🔵 [Auth Orchestrator] Stored userId and profileType:', profileResult.profileType);

    // Step 4: Return auth result
    console.log('🟢 [Auth Orchestrator] Authentication complete! Returning result...');
    return {
      userId,
      profileType: profileResult.profileType,
      profile: profileResult.profile,
    };
  } catch (error: any) {
    console.log('🔴 [Auth Orchestrator] Authentication error:', error);
    throw error;
  }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  try {
    await supabase.auth.signOut();
    Storage.removeItem(USER_ID_KEY);
    Storage.removeItem(PROFILE_TYPE_KEY);
  } catch (error) {
    console.log('Sign out error:', error);
    throw error;
  }
}

/**
 * Get the current session
 */
export async function getCurrentSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

/**
 * Get the stored user ID from storage
 */
export function getStoredUserId(): string | undefined {
  return Storage.getItem(USER_ID_KEY);
}

/**
 * Get the stored profile type from storage
 */
export function getStoredProfileType(): 'coach' | 'client' | null {
  const type = Storage.getItem(PROFILE_TYPE_KEY);
  return type === 'coach' || type === 'client' ? type : null;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getCurrentSession();
  return !!session;
}

/**
 * Restore session from storage
 */
export async function restoreSession(): Promise<AuthResult | null> {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return null;
    }

    const userId = session.user.id;
    const profileResult = await validateUserProfile(userId);

    if (!profileResult.profileType || !profileResult.profile) {
      // Session exists but no profile - sign out
      await signOut();
      return null;
    }

    // Update storage with latest info
    Storage.setItem(USER_ID_KEY, userId);
    Storage.setItem(PROFILE_TYPE_KEY, profileResult.profileType);

    return {
      userId,
      profileType: profileResult.profileType,
      profile: profileResult.profile,
    };
  } catch (error) {
    console.log('Error restoring session:', error);
    return null;
  }
}
