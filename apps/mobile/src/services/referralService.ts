import { supabase } from '../lib/supabase';

// Database interface - represents what comes from the database
interface ReferralCodeRow {
  id: string;
  referral_code: string;
  type: string; // Database column type (could be old enum values)
  inserted_at: string;
  updated_at: string;
}

// Application interface - represents the normalized types we use in the app
export interface ReferralCode {
  id: string;
  referral_code: string;
  type: 'SKIP_PAYWALL' | 'discount_30' | 'discount_40';
  inserted_at: string;
  updated_at: string;
}

export interface ReferralValidationResult {
  isValid: boolean;
  referralCode?: ReferralCode;
  error?: string;
}

export async function validateReferralCode(code: string): Promise<ReferralValidationResult> {
  try {
    if (!code || code.trim().length === 0) {
      return {
        isValid: false,
        error: 'Referral code is required',
      };
    }

    const { data, error } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('referral_code', code.trim().toUpperCase())
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return {
          isValid: false,
          error: 'Referral code not found',
        };
      }
      throw error;
    }

    if (!data) {
      return {
        isValid: false,
        error: 'Referral code not found',
      };
    }

    // Map database row to application interface
    const typeMapping: Record<string, 'SKIP_PAYWALL' | 'discount_30' | 'discount_40'> = {
      'SKIP_PAYWALL': 'SKIP_PAYWALL',
      'discount_30': 'discount_30',
      'discount_40': 'discount_40',
      'DISCOUNT': 'discount_30', // Default discount to 30% for legacy codes
    };

    const mappedType = typeMapping[data.type];
    if (!mappedType) {
      return {
        isValid: false,
        error: 'Invalid referral code type',
      };
    }

    const referralCode: ReferralCode = {
      id: data.id,
      referral_code: data.referral_code,
      type: mappedType,
      inserted_at: data.inserted_at,
      updated_at: data.updated_at,
    };

    return {
      isValid: true,
      referralCode,
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Failed to validate referral code',
    };
  }
}

// Updated to support new referral code types: SKIP_PAYWALL, discount_30, discount_40
export async function getReferralCodeType(
  code: string
): Promise<{ type?: 'SKIP_PAYWALL' | 'discount_30' | 'discount_40'; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('referral_codes')
      .select('type')
      .eq('referral_code', code)
      .single();

    if (error && error.code === 'PGRST116') {
      // No rows found
      return { error: 'Referral code not found' };
    } else if (error) {
      return { error: error.message };
    }

    if (data && data.type) {
      // Map old database values to new types
      const typeMapping: Record<string, 'SKIP_PAYWALL' | 'discount_30' | 'discount_40'> = {
        'SKIP_PAYWALL': 'SKIP_PAYWALL',
        'discount_30': 'discount_30',
        'discount_40': 'discount_40',
      };

      const mappedType = typeMapping[data.type];
      if (mappedType) {
        return { type: mappedType };
      } else {
        return { error: 'Invalid referral code type' };
      }
    } else {
      return { error: 'Invalid referral code type' };
    }
  } catch (e) {
    return { error: 'An unexpected error occurred' };
  }
}

export async function getUserReferralCode(
  userId: string
): Promise<{ referralCode?: string; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('user_info')
      .select('referral_code')
      .eq('user_id', userId)
      .single();

    if (error) {
      return { error: error.message };
    }

    if (data && data.referral_code) {
      return { referralCode: data.referral_code };
    } else {
      return { referralCode: undefined };
    }
  } catch (e) {
    return { error: 'An unexpected error occurred' };
  }
}
