/**
 * Intercom API client
 * Wrapper around the Express API for Intercom operations
 */

import { apiRequest } from '../api/client';

export const intercomApi = {
  /**
   * Get Intercom JWT token
   */
  jwt: async (token?: string | null) => {
    return apiRequest('/intercom/jwt', {}, token);
  },
};

