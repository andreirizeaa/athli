import { supabase } from '../lib/supabase';

export interface ReviewOverride {
  id: string;
  status: boolean;
  inserted_at: string;
  updated_at: string;
}

export interface OverrideResult {
  status?: boolean;
  error?: string;
}

export async function getReviewOverrideStatus(): Promise<OverrideResult> {
  try {
    const { data, error } = await supabase
      .from('review_overrides')
      .select('status')
      .eq('id', 'global')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - default to false
        return { status: false };
      }
      return { error: error.message };
    }

    if (data && typeof data.status === 'boolean') {
      return { status: data.status };
    } else {
      return { status: false };
    }
  } catch (e) {
    return { error: 'An unexpected error occurred' };
  }
}
