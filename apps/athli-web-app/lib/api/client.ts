/**
 * API Client for Express Server
 * Centralized client for making API calls to the Node.js Express backend
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

/**
 * Get the Supabase session token for authentication (client-side)
 * Note: This should be called from client components that have access to Supabase client
 */
const getAuthToken = async (): Promise<string | null> => {
  try {
    if (typeof window === 'undefined') {
      return null;
    }

    // Get Supabase session token
    // Components should use useSupabase hook and pass token directly
    return null;
  } catch {
    return null;
  }
};

/**
 * Make an authenticated API request
 * @param endpoint - API endpoint (e.g., '/intercom/jwt')
 * @param options - Fetch options
 * @param token - Optional Supabase session token
 */
export const apiRequest = async (
  endpoint: string,
  options: RequestInit = {},
  token?: string | null
): Promise<Response> => {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Add Authorization header if token is provided
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Include cookies
  });
};

/**
 * Calendar API methods
 */
export const calendarApi = {
  status: () => apiRequest('/calendar/status'),
  disconnect: () => apiRequest('/calendar/disconnect', { method: 'DELETE' }),
  events: (timeMin?: string, timeMax?: string) => {
    const params = new URLSearchParams();
    if (timeMin) params.set('timeMin', timeMin);
    if (timeMax) params.set('timeMax', timeMax);
    const query = params.toString();
    return apiRequest(`/calendar/events${query ? `?${query}` : ''}`);
  },
  callback: (data: {
    provider: string;
    provider_access_token?: string;
    access_token?: string;
    provider_refresh_token?: string;
    refresh_token?: string;
  }) =>
    apiRequest('/calendar/callback', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

/**
 * Email API methods
 */
export const emailApi = {
  status: () => apiRequest('/email/status'),
  callback: (data: {
    provider: string;
    provider_access_token?: string;
    access_token?: string;
    provider_refresh_token?: string;
    refresh_token?: string;
  }) =>
    apiRequest('/email/callback', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

/**
 * Intercom API methods
 */
export const intercomApi = {
  jwt: () => apiRequest('/intercom/jwt'),
};

/**
 * Provider detection API methods
 */
export const providerApi = {
  detect: (email: string) =>
    apiRequest(`/provider/detect?email=${encodeURIComponent(email)}`),
};

