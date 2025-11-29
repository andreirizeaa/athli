import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import { Client as GraphClient } from '@microsoft/microsoft-graph-client';
import 'isomorphic-fetch';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { userId } = await auth();

  const { searchParams } = new URL(req.url);
  const timeMin = new Date(searchParams.get('timeMin') || new Date());
  const timeMax = new Date(searchParams.get('timeMax') || Date.now() + 30 * 24 * 3600 * 1000);

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json(
      { error: 'Missing NEXT_PUBLIC_SUPABASE_URL' },
      { status: 500 }
    );
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: 'Missing SUPABASE_SERVICE_ROLE_KEY' },
      { status: 500 }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data, error: supabaseError } = await supabase
    .from('user_calendar_accounts')
    .select('*')
    .eq('clerk_user_id', userId)
    .single();

  if (supabaseError || !data) {
    return NextResponse.json(
      { error: 'No calendar linked' },
      { status: 400 }
    );
  }

  const { provider, access_token, refresh_token, token_expires_at } = data;
  if (!access_token) {
    return NextResponse.json(
      { error: 'Missing access token' },
      { status: 400 }
    );
  }

  try {
    if (provider === 'google') {
      const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      const googleClientSecret = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET;

      if (!googleClientId || !googleClientSecret) {
        return NextResponse.json(
          { error: 'Google OAuth credentials not configured' },
          { status: 500 }
        );
      }

      const oauth2Client = new google.auth.OAuth2(
        googleClientId,
        googleClientSecret
      );

      oauth2Client.setCredentials({
        access_token,
        refresh_token: refresh_token || undefined,
      });

      // Check if token is expired and refresh if needed
      const isTokenExpired = token_expires_at
        ? new Date(token_expires_at) < new Date()
        : false;

      if (isTokenExpired && refresh_token) {
        try {
          const { credentials } = await oauth2Client.refreshAccessToken();
          
          // Update tokens in database
          await supabase
            .from('user_calendar_accounts')
            .update({
              access_token: credentials.access_token,
              refresh_token: credentials.refresh_token || refresh_token,
              token_expires_at: credentials.expiry_date
                ? new Date(credentials.expiry_date).toISOString()
                : new Date(Date.now() + 3600 * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('clerk_user_id', userId);

          // Update OAuth client with new tokens
          oauth2Client.setCredentials(credentials);
        } catch (refreshError) {
          // If refresh fails, the refresh token is invalid
          return NextResponse.json(
            { error: 'Calendar access expired. Please reconnect your calendar.' },
            { status: 401 }
          );
        }
      }

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      const events = await calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        maxResults: 2500,
        singleEvents: true,
        orderBy: 'startTime',
      });

      return NextResponse.json(events.data.items || []);
    }

    if (provider === 'outlook') {
      const graphClient = GraphClient.init({
        authProvider: (done) => done(null, access_token),
      });

      const result = await graphClient
        .api('/me/events')
        .top(250)
        .filter(
          `start/dateTime ge '${timeMin.toISOString()}' and end/dateTime le '${timeMax.toISOString()}'`
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
          summary: event.subject || '', // Outlook uses 'subject' instead of 'summary'
          start: {
            dateTime: event.start?.dateTime,
            date: event.start?.date,
          },
          end: {
            dateTime: event.end?.dateTime,
            date: event.end?.date,
          },
          description: event.body?.content || event.bodyPreview || '',
          location: event.location?.displayName || event.location?.locationUri || '',
        })
      );

      return NextResponse.json(normalizedEvents);
    }

    return NextResponse.json({ error: 'Unknown provider' }, { status: 400 });
  } catch (error: unknown) {

    let errorMessage = 'Failed to fetch calendar events';
    let statusCode = 500;

    if (error && typeof error === 'object' && 'response' in error) {
      const apiError = error as { response?: { data?: unknown; status?: number } };
      statusCode = apiError.response?.status || 500;

      if (apiError.response?.data && typeof apiError.response.data === 'object' && 'error' in apiError.response.data) {
        const providerError = apiError.response.data as { error?: string | { message?: string; code?: number } };
        if (typeof providerError.error === 'string') {
          errorMessage = providerError.error;
        } else if (providerError.error?.message) {
          errorMessage = providerError.error.message;
        }
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;

      if (error.message.includes('invalid_request')) {
        errorMessage = 'Invalid request to calendar API. The access token may be invalid or expired. Please reconnect your calendar.';
        statusCode = 400;
      } else if (
        error.message.includes('invalid_grant') ||
        error.message.includes('invalid_token') ||
        error.message.includes('Token has been expired') ||
        error.message.includes('unauthorized')
      ) {
        errorMessage = 'Calendar access expired. Please reconnect your calendar.';
        statusCode = 401;
      } else if (
        error.message.includes('insufficient permission') ||
        error.message.includes('Forbidden') ||
        error.message.includes('permission denied')
      ) {
        errorMessage = 'Insufficient calendar permissions. Please reconnect with proper permissions.';
        statusCode = 403;
      }
    }

    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}

