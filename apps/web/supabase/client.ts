import { createBrowserClient } from '@supabase/ssr';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

// Singleton client instance - Supabase recommends one client per app
let client: ReturnType<typeof createBrowserClient> | null = null;

// Cached session to avoid hitting auth endpoint on every API request
let cachedSession: Session | null = null;
let sessionPromise: Promise<Session | null> | null = null;

export function createClient() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_KEY!
    );

    // Set up auth state listener to keep session cache in sync
    client.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      cachedSession = session;
    });
  }
  return client;
}

/**
 * Get the cached access token without hitting Supabase auth endpoint.
 * Falls back to getSession() only if no cached session exists.
 * This dramatically reduces auth requests when used in axios interceptor.
 */
export async function getCachedAccessToken(): Promise<string | null> {
  // If we have a cached session and it's not expired, use it
  if (cachedSession?.access_token) {
    const expiresAt = cachedSession.expires_at;
    // Check if token expires in more than 60 seconds (buffer for clock skew)
    if (expiresAt && expiresAt > Math.floor(Date.now() / 1000) + 60) {
      return cachedSession.access_token;
    }
  }

  // Avoid multiple concurrent getSession calls
  if (sessionPromise) {
    const session = await sessionPromise;
    return session?.access_token ?? null;
  }

  // No cached session or it's expired - fetch fresh session
  const supabase = createClient();
  sessionPromise = supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
    cachedSession = session;
    sessionPromise = null;
    return session;
  });

  const session = await sessionPromise;
  return session?.access_token ?? null;
}

/**
 * Clear the cached session (call on sign out)
 */
export function clearCachedSession() {
  cachedSession = null;
  sessionPromise = null;
}
