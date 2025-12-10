import { getSupabaseClient } from './supabase.service';

export class EmailService {
  async saveTokens(
    userId: string,
    accessToken: string,
    refreshToken: string | undefined,
    provider: string
  ): Promise<void> {
    const supabase = getSupabaseClient();

    const tokenExpiresAt = new Date(Date.now() + 3600 * 1000);

    const { error } = await supabase.from('user_email_accounts').upsert({
      clerk_user_id: userId,
      provider: provider === 'azure' ? 'outlook' : provider,
      provider_account_id: '',
      access_token: accessToken,
      refresh_token: refreshToken,
      token_expires_at: tokenExpiresAt,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  async getStatus(userId: string): Promise<{
    connected: boolean;
    provider?: string;
  }> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('user_email_accounts')
      .select('id, provider')
      .eq('clerk_user_id', userId)
      .single();

    if (error || !data) {
      return { connected: false };
    }

    return { connected: true, provider: data.provider };
  }
}

