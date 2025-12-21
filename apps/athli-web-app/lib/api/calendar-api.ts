/**
 * Calendar API Client
 * Wrapper around the base API client with token support for calendar operations
 */

import { apiRequest } from './client';

export const calendarApi = {
  /**
   * Check calendar connection status
   * @param token - Optional Clerk session token
   */
  status: (token?: string | null) => apiRequest('/calendar/status', {}, token),

  /**
   * Disconnect calendar
   * @param token - Optional Clerk session token
   */
  disconnect: (token?: string | null) =>
    apiRequest('/calendar/disconnect', { method: 'DELETE' }, token),

  /**
   * Get calendar events
   * @param timeMin - Start time (ISO string)
   * @param timeMax - End time (ISO string)
   * @param token - Optional Clerk session token
   */
  events: (timeMin?: string, timeMax?: string, token?: string | null) => {
    const params = new URLSearchParams();
    if (timeMin) params.set('timeMin', timeMin);
    if (timeMax) params.set('timeMax', timeMax);
    const query = params.toString();
    return apiRequest(`/calendar/events${query ? `?${query}` : ''}`, {}, token);
  },

  /**
   * Handle calendar OAuth callback
   * @param data - Callback data
   * @param token - Optional Clerk session token
   */
  callback: (
    data: {
      provider: string;
      provider_access_token?: string;
      access_token?: string;
      provider_refresh_token?: string;
      refresh_token?: string;
    },
    token?: string | null
  ) =>
    apiRequest(
      '/calendar/callback',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      token
    ),

  /**
   * Detect calendar provider from email
   * @param email - Email address
   * @param token - Optional Clerk session token
   */
  detectProvider: (email: string, token?: string | null) =>
    apiRequest(`/provider/detect?email=${encodeURIComponent(email)}`, {}, token),
};
