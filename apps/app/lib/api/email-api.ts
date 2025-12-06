/**
 * Email API client
 * Wrapper around the Express API for email operations
 */

import { apiRequest } from './client';

export const emailApi = {
  /**
   * Check email connection status
   */
  status: async (token?: string | null) => {
    return apiRequest('/email/status', {}, token);
  },

  /**
   * Store email OAuth tokens
   */
  callback: async (
    data: {
      provider: string;
      provider_access_token?: string;
      access_token?: string;
      provider_refresh_token?: string | null;
      refresh_token?: string | null;
    },
    token?: string | null
  ) => {
    return apiRequest(
      '/email/callback',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      token
    );
  },
};

