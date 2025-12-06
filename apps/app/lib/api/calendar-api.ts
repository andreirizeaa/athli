/**
 * Calendar API client
 * Wrapper around the Express API for calendar operations
 */

import { apiRequest } from './client';

export const calendarApi = {
  /**
   * Check calendar connection status
   */
  status: async (token?: string | null) => {
    return apiRequest('/calendar/status', {}, token);
  },

  /**
   * Disconnect calendar account
   */
  disconnect: async (token?: string | null) => {
    return apiRequest('/calendar/disconnect', { method: 'DELETE' }, token);
  },

  /**
   * Get calendar events
   */
  events: async (timeMin?: string, timeMax?: string, token?: string | null) => {
    const params = new URLSearchParams();
    if (timeMin) params.set('timeMin', timeMin);
    if (timeMax) params.set('timeMax', timeMax);
    const query = params.toString();
    return apiRequest(`/calendar/events${query ? `?${query}` : ''}`, {}, token);
  },

  /**
   * Store calendar OAuth tokens
   */
  callback: async (
    data: {
      provider: string;
      provider_access_token?: string;
      access_token?: string;
      provider_refresh_token?: string;
      refresh_token?: string;
    },
    token?: string | null
  ) => {
    return apiRequest(
      '/calendar/callback',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      token
    );
  },

  /**
   * Detect email provider
   */
  detectProvider: async (email: string) => {
    return apiRequest(`/provider/detect?email=${encodeURIComponent(email)}`);
  },
};

