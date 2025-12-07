import { AuthError, SupabaseClient } from '@supabase/supabase-js';
import { removeUserId } from './storageService';
import { track } from './analytics';

export interface AuthErrorInfo {
  isRefreshTokenError: boolean;
  isSessionExpired: boolean;
  shouldRedirectToSignIn: boolean;
  errorMessage: string;
}

/**
 * Analyzes Supabase auth errors and determines the appropriate response
 */
export function analyzeAuthError(error: any): AuthErrorInfo {
  const errorMessage = error?.message || 'Unknown authentication error';
  const errorCode = error?.code || '';

  // Check for refresh token errors
  const isRefreshTokenError =
    errorMessage.includes('Invalid Refresh Token') ||
    errorMessage.includes('Refresh Token Not Found') ||
    errorMessage.includes('refresh_token_not_found') ||
    errorCode === 'refresh_token_not_found';

  // Check for session expired errors
  const isSessionExpired =
    errorMessage.includes('session_not_found') ||
    errorMessage.includes('Session not found') ||
    errorMessage.includes('invalid_grant') ||
    errorCode === 'session_not_found';

  // Determine if we should redirect to sign in
  const shouldRedirectToSignIn =
    isRefreshTokenError ||
    isSessionExpired ||
    errorMessage.includes('invalid_token') ||
    errorMessage.includes('token_expired');

  return {
    isRefreshTokenError,
    isSessionExpired,
    shouldRedirectToSignIn,
    errorMessage,
  };
}

/**
 * Handles authentication errors by clearing user data and optionally redirecting
 */
export async function handleAuthError(
  supabaseClient: SupabaseClient,
  error: any,
  onRedirectToSignIn?: () => void
): Promise<void> {
  const errorInfo = analyzeAuthError(error);

  // Track the error for analytics
  track('Authentication Error', {
    error_message: errorInfo.errorMessage,
    is_refresh_token_error: errorInfo.isRefreshTokenError,
    is_session_expired: errorInfo.isSessionExpired,
    should_redirect: errorInfo.shouldRedirectToSignIn,
  });

  // Clear user data from storage
  try {
    await removeUserId();
  } catch (storageError) {
    console.warn('Failed to clear user data:', storageError);
  }

  // Sign out from Supabase to clear any cached session
  try {
    await supabaseClient.auth.signOut();
  } catch (signOutError) {
    console.warn('Failed to sign out from Supabase:', signOutError);
  }

  // Redirect to sign in if needed
  if (errorInfo.shouldRedirectToSignIn && onRedirectToSignIn) {
    onRedirectToSignIn();
  }
}

/**
 * Wraps Supabase operations with automatic auth error handling
 */
export async function withAuthErrorHandling<T>(
  supabaseClient: SupabaseClient,
  operation: () => Promise<T>,
  onRedirectToSignIn?: () => void
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    const errorInfo = analyzeAuthError(error);

    if (errorInfo.shouldRedirectToSignIn) {
      await handleAuthError(supabaseClient, error, onRedirectToSignIn);
      return null;
    }

    // Re-throw non-auth errors
    throw error;
  }
}
