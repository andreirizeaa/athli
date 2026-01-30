import { AuthError } from '@supabase/supabase-js';

export function getPasswordErrorMessage(error: AuthError | Error): string {
  // Check for Supabase AuthWeakPasswordError
  if ('code' in error && error.code === 'weak_password') {
    const weakPasswordError = error as any;
    const reasons = weakPasswordError.weak_password?.reasons || [];

    if (reasons.includes('pwned')) {
      return 'This password was found in a data breach. Please choose a different, more secure password.';
    }

    // Other weak password reasons
    return 'This password is too weak. Please choose a stronger password.';
  }

  return error.message || 'An error occurred';
}

export function isWeakPasswordError(error: any): boolean {
  return error?.code === 'weak_password';
}
