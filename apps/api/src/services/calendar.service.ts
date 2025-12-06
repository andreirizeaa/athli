import { google } from 'googleapis';
import { Client as GraphClient } from '@microsoft/microsoft-graph-client';
import 'isomorphic-fetch';
import { getSupabaseClient } from './supabase.service';

export interface CalendarEvent {
  id: string;
  summary?: string;
  start?: {
    dateTime?: string;
    date?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
  };
  description?: string;
  location?: string;
}

export class CalendarService {
  async getEvents(
    userId: string,
    timeMin?: Date,
    timeMax?: Date
  ): Promise<CalendarEvent[]> {
    const supabase = getSupabaseClient();

    const { data, error: supabaseError } = await supabase
      .from('user_calendar_accounts')
      .select('*')
      .eq('clerk_user_id', userId)
      .single();

    if (supabaseError || !data) {
      throw new Error('No calendar linked');
    }

    const { provider, access_token, refresh_token, token_expires_at } = data;

    if (!access_token) {
      throw new Error('Missing access token');
    }

    if (provider === 'google') {
      return this.getGoogleEvents(
        userId,
        access_token,
        refresh_token || undefined,
        token_expires_at,
        timeMin,
        timeMax
      );
    }

    if (provider === 'outlook') {
      return this.getOutlookEvents(access_token, timeMin, timeMax);
    }

    throw new Error('Unknown provider');
  }

  private async getGoogleEvents(
    userId: string,
    accessToken: string,
    refreshToken: string | undefined,
    tokenExpiresAt: string | null,
    timeMin?: Date,
    timeMax?: Date
  ): Promise<CalendarEvent[]> {
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const googleClientSecret = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET;

    if (!googleClientId || !googleClientSecret) {
      throw new Error('Google OAuth credentials not configured');
    }

    const oauth2Client = new google.auth.OAuth2(
      googleClientId,
      googleClientSecret
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    // Check if token is expired and refresh if needed
    const isTokenExpired = tokenExpiresAt
      ? new Date(tokenExpiresAt) < new Date()
      : false;

    if (isTokenExpired && refreshToken) {
      try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        const supabase = getSupabaseClient();

        // Update tokens in database
        await supabase
          .from('user_calendar_accounts')
          .update({
            access_token: credentials.access_token,
            refresh_token: credentials.refresh_token || refreshToken,
            token_expires_at: credentials.expiry_date
              ? new Date(credentials.expiry_date).toISOString()
              : new Date(Date.now() + 3600 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('clerk_user_id', userId);

        // Update OAuth client with new tokens
        oauth2Client.setCredentials(credentials);
      } catch (refreshError) {
        throw new Error(
          'Calendar access expired. Please reconnect your calendar.'
        );
      }
    }

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const events = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin?.toISOString(),
      timeMax: timeMax?.toISOString(),
      maxResults: 2500,
      singleEvents: true,
      orderBy: 'startTime',
    });

    return (events.data.items || []) as CalendarEvent[];
  }

  private async getOutlookEvents(
    accessToken: string,
    timeMin?: Date,
    timeMax?: Date
  ): Promise<CalendarEvent[]> {
    const graphClient = GraphClient.init({
      authProvider: (done) => done(null, accessToken),
    });

    const timeMinStr = timeMin?.toISOString() || new Date().toISOString();
    const timeMaxStr =
      timeMax?.toISOString() ||
      new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();

    const result = await graphClient
      .api('/me/events')
      .top(250)
      .filter(
        `start/dateTime ge '${timeMinStr}' and end/dateTime le '${timeMaxStr}'`
      )
      .get();

    // Normalize Outlook events to match Google Calendar format
    const normalizedEvents = (result.value || []).map(
      (event: {
        id?: string;
        subject?: string;
        start?: { dateTime?: string; date?: string };
        end?: { dateTime?: string; date?: string };
        body?: { content?: string };
        bodyPreview?: string;
        location?: { displayName?: string; locationUri?: string };
      }) => ({
        id: event.id || '',
        summary: event.subject || '',
        start: {
          dateTime: event.start?.dateTime,
          date: event.start?.date,
        },
        end: {
          dateTime: event.end?.dateTime,
          date: event.end?.date,
        },
        description: event.body?.content || event.bodyPreview || '',
        location:
          event.location?.displayName || event.location?.locationUri || '',
      })
    );

    return normalizedEvents;
  }

  async saveTokens(
    userId: string,
    accessToken: string,
    refreshToken: string | undefined,
    provider: string
  ): Promise<void> {
    const supabase = getSupabaseClient();

    const tokenExpiresAt = new Date(Date.now() + 3600 * 1000);

    const { error } = await supabase.from('user_calendar_accounts').upsert({
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

  async disconnect(userId: string): Promise<void> {
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('user_calendar_accounts')
      .delete()
      .eq('clerk_user_id', userId);

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
      .from('user_calendar_accounts')
      .select('id, provider')
      .eq('clerk_user_id', userId)
      .single();

    if (error || !data) {
      return { connected: false };
    }

    return { connected: true, provider: data.provider };
  }
}

