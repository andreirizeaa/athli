import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '@/lib/supabase';
import { Platform } from 'react-native';

export interface AppleAuthResult {
  userId: string;
  error?: string;
}

/**
 * Sign in with Apple using Supabase
 */
export async function signInWithApple(): Promise<AppleAuthResult> {
  try {
    // Apple Sign In is only available on iOS
    if (Platform.OS !== 'ios') {
      return {
        userId: '',
        error: 'Apple Sign In is only available on iOS',
      };
    }

    // Check if Apple Authentication is available
    const isAvailable = await AppleAuthentication.isAvailableAsync();
    if (!isAvailable) {
      return {
        userId: '',
        error: 'Apple Sign In is not available on this device',
      };
    }

    // Request Apple credentials
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    // Sign in to Supabase with Apple ID token
    // Note: For Apple Sign In, we don't pass a nonce in signInWithIdToken
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken!,
    });

    if (error) {
      throw error;
    }

    if (!data.user) {
      throw new Error('No user returned from Apple sign-in');
    }

    // Update user metadata with name (first-time) and timezone
    const updateData: Record<string, string> = {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    if (credential.fullName?.givenName || credential.fullName?.familyName) {
      const fullName = [
        credential.fullName.givenName,
        credential.fullName.familyName,
      ]
        .filter(Boolean)
        .join(' ');

      if (fullName) {
        updateData.name = fullName;
      }
    }

    await supabase.auth.updateUser({ data: updateData });

    return {
      userId: data.user.id,
    };
  } catch (error: any) {
    if (error.code === 'ERR_REQUEST_CANCELED') {
      return {
        userId: '',
        error: 'Apple Sign In was cancelled',
      };
    }

    console.log('Apple sign-in error:', error);
    return {
      userId: '',
      error: error.message || 'Failed to sign in with Apple',
    };
  }
}
