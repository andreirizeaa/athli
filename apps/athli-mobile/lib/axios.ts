import axios from 'axios';
import { supabase } from './supabase';
import Constants from 'expo-constants';
import type { Session } from '@supabase/supabase-js';

// Try process.env first, then Constants.expoConfig.extra, then fallback
const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_ROUTE ||
  Constants.expoConfig?.extra?.EXPO_PUBLIC_API_ROUTE as string ||
  'http://localhost:3002'
).replace(/\/+$/, '');

const API_VERSION = 'api/v1';

export const API_URL = `${API_BASE_URL}/${API_VERSION}`;

// Debug log to verify API URL
console.log('[API] process.env.EXPO_PUBLIC_API_ROUTE:', process.env.EXPO_PUBLIC_API_ROUTE);
console.log('[API] Constants.expoConfig.extra:', Constants.expoConfig?.extra?.EXPO_PUBLIC_API_ROUTE);
console.log('[API] Base URL:', API_BASE_URL);
console.log('[API] Full API URL:', API_URL);

// Cache session in memory to avoid calling getSession() on every request
let cachedSession: Session | null = null;

// Subscribe to auth state changes to keep cache in sync
supabase.auth.onAuthStateChange((event, session) => {
  console.log('[API] Auth state changed, updating cached session:', event);
  cachedSession = session;
});

// Initialize cached session on module load
(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  cachedSession = session;
  console.log('[API] Initial session cached');
})();

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {},
  timeout: 30000, // 30 seconds timeout for mobile
});

// Request interceptor to add Auth token
axiosInstance.interceptors.request.use(
  async (config) => {
    console.log('[API] Making request:', config.method?.toUpperCase(), config.url);
    console.log('[API] Full URL:', `${config.baseURL}${config.url}`);

    // Use cached session instead of calling getSession() on every request
    if (cachedSession?.access_token) {
      config.headers.Authorization = `Bearer ${cachedSession.access_token}`;
      console.log('[API] Auth token added from cache');
    } else {
      console.log('[API] No auth token available');
    }

    return config;
  },
  (error) => {
    console.error('[API] Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for global error handling
axiosInstance.interceptors.response.use(
  (response) => {
    console.log('[API] Response:', response.config.method?.toUpperCase(), response.config.url, response.status);
    return response;
  },
  async (error) => {
    // Detailed error logging
    console.error('[API] Request failed:', {
      url: error.config?.url,
      method: error.config?.method,
      baseURL: error.config?.baseURL,
      message: error.message,
      code: error.code,
      hasResponse: !!error.response,
      status: error.response?.status,
    });

    // Handle 401 Unauthorized - attempt token refresh and retry
    if (error.response?.status === 401 && error.config && !error.config._retry) {
      console.warn('[API] Unauthorized - attempting token refresh');

      // Mark this request as retried to prevent infinite loops
      error.config._retry = true;

      try {
        // Attempt to refresh the session
        const { data, error: refreshError } = await supabase.auth.refreshSession();

        if (refreshError || !data.session) {
          console.error('[API] Token refresh failed:', refreshError);
          // Session is invalid - user needs to re-authenticate
          // The onAuthStateChange listener will handle the logout
          cachedSession = null;
          return Promise.reject(error);
        }

        console.log('[API] Token refreshed successfully, retrying request');

        // Update cached session with new token
        cachedSession = data.session;

        // Update the failed request's auth header with new token
        error.config.headers.Authorization = `Bearer ${data.session.access_token}`;

        // Retry the original request
        return axiosInstance.request(error.config);
      } catch (refreshError) {
        console.error('[API] Error during token refresh:', refreshError);
        return Promise.reject(error);
      }
    }

    // Handle network errors
    if (error.message === 'Network Error') {
      console.error('[API] Network error - check your connection');
      console.error('[API] This usually means:');
      console.error('[API] 1. Server is not reachable at:', error.config?.baseURL);
      console.error('[API] 2. CORS is blocking the request');
      console.error('[API] 3. Device cannot access the network');
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
