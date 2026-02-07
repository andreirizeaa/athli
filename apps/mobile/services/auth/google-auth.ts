import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { supabase } from '@/lib/supabase';
import { Platform } from 'react-native';

// Configure Google Sign-In
// webClientId is required on Android to receive an ID token
GoogleSignin.configure({
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS,
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB,
  offlineAccess: false,
});

export interface GoogleAuthResult {
  userId: string;
  error?: string;
}

/**
 * Sign in with Google using native Google Sign-In SDK
 * Then authenticate with Supabase using the ID token
 */
export async function signInWithGoogle(): Promise<GoogleAuthResult> {
  try {
    console.log('🔵 [Google Auth] Starting Google Sign-In...');

    // Check if device supports Google Play Services (Android only)
    await GoogleSignin.hasPlayServices();
    console.log('🔵 [Google Auth] Play Services check passed');

    // Sign in with Google using native UI
    const userInfo = await GoogleSignin.signIn();
    console.log('🔵 [Google Auth] Google Sign-In successful, user:', userInfo.data?.user?.email);

    // Check if user cancelled (signIn may return undefined data on cancel)
    if (!userInfo.data) {
      console.log('🟡 [Google Auth] User cancelled sign-in (no data)');
      return {
        userId: '',
        error: 'Google Sign-In was cancelled',
      };
    }

    if (!userInfo.data.idToken) {
      console.log('🔴 [Google Auth] No ID token received from Google');
      throw new Error('No ID token received from Google');
    }

    console.log('🔵 [Google Auth] ID token received, authenticating with Supabase...');

    // Sign in to Supabase with the Google ID token
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: userInfo.data.idToken,
    });

    if (error) {
      console.log('🔴 [Google Auth] Supabase auth error:', error);
      throw error;
    }

    if (!data.user) {
      console.log('🔴 [Google Auth] No user returned from Supabase');
      throw new Error('No user returned from Google sign-in');
    }

    console.log('🟢 [Google Auth] Authentication successful! User ID:', data.user.id);

    // Set timezone in user metadata (not available during OAuth token exchange)
    await supabase.auth.updateUser({
      data: { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    });

    return {
      userId: data.user.id,
    };
  } catch (error: any) {
    console.log('🔴 [Google Auth] Error:', error);

    // Handle specific error cases
    if (error.code === 'SIGN_IN_CANCELLED') {
      console.log('🟡 [Google Auth] User cancelled sign-in');
      return {
        userId: '',
        error: 'Google Sign-In was cancelled',
      };
    }

    if (error.code === 'IN_PROGRESS') {
      console.log('🟡 [Google Auth] Sign-in already in progress');
      return {
        userId: '',
        error: 'Google Sign-In is already in progress',
      };
    }

    if (error.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
      console.log('🟡 [Google Auth] Play Services not available');
      return {
        userId: '',
        error: 'Google Play Services is not available',
      };
    }

    return {
      userId: '',
      error: error.message || 'Failed to sign in with Google',
    };
  }
}
