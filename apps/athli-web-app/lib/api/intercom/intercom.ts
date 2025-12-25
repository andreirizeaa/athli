import { apiFetch } from '../api-client';

/**
 * Intercom API methods
 */
export const intercomApi = {
  jwt: () => apiFetch('/intercom/jwt'),
};
