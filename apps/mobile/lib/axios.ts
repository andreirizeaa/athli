import axios, { type InternalAxiosRequestConfig } from 'axios';
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

// Rate limiting state
let isRateLimited = false;
let rateLimitResetTime = 0;
let pendingRequests: Array<{
  resolve: (config: InternalAxiosRequestConfig) => void;
  reject: (error: Error) => void;
  config: InternalAxiosRequestConfig;
}> = [];

// Process queued requests after rate limit expires
const processQueue = () => {
  console.log(`[API] Rate limit lifted, processing ${pendingRequests.length} queued requests`);
  const queue = [...pendingRequests];
  pendingRequests = [];
  queue.forEach(({ resolve, config }) => resolve(config));
};

// Wait for rate limit to expire
const waitForRateLimit = (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
  return new Promise((resolve, reject) => {
    pendingRequests.push({ resolve, reject, config });
    console.log(`[API] Request queued: ${config.url} (${pendingRequests.length} in queue)`);
  });
};

// Subscribe to auth state changes to keep cache in sync
supabase.auth.onAuthStateChange((event, session) => {
  console.log('[API] Auth state changed, updating cached session:', event);
  cachedSession = session;
});

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {},
  timeout: 120000, // 2 minutes timeout for mobile (to handle video uploads up to 50MB)
});

// Request interceptor to add Auth token and handle rate limiting
axiosInstance.interceptors.request.use(
  async (config) => {
    // Check if we're currently rate limited
    if (isRateLimited) {
      const now = Date.now();
      if (now < rateLimitResetTime) {
        // Still rate limited - queue this request
        console.log(`[API] Rate limited - queuing request: ${config.url}`);
        return waitForRateLimit(config);
      } else {
        // Rate limit has expired
        isRateLimited = false;
        processQueue();
      }
    }

    console.log('[API] Making request:', config.method?.toUpperCase(), config.url);
    console.log('[API] Full URL:', `${config.baseURL}${config.url}`);

    // If no cached session, try to get from auth store (already initialized by _layout.tsx)
    if (!cachedSession) {
      const { useAuthSessionStore } = await import('@/stores/useAuthSessionStore');
      const storeSession = useAuthSessionStore.getState().session;
      if (storeSession) {
        cachedSession = storeSession;
        console.log('[API] Session retrieved from auth store');
      }
    }

    // If still no cached session, fetch directly from Supabase (handles fresh login case)
    if (!cachedSession) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        cachedSession = session;
        console.log('[API] Session retrieved from Supabase');
      }
    }

    // Use cached session
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
          // Session is invalid - sign out to trigger SIGNED_OUT event
          // The onAuthStateChange listener in _layout.tsx will handle cleanup and navigation
          cachedSession = null;
          await supabase.auth.signOut();
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
        // Sign out to trigger SIGNED_OUT event and redirect to welcome
        cachedSession = null;
        await supabase.auth.signOut().catch(() => {});
        return Promise.reject(error);
      }
    }

    // Handle 429 Rate Limit - pause all requests
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      // Default to 10 seconds if no retry-after header
      const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : 10000;

      console.warn(`[API] Rate limited (429) - pausing requests for ${waitTime / 1000}s`);

      // Only set rate limit state once (first 429 response)
      if (!isRateLimited) {
        isRateLimited = true;
        rateLimitResetTime = Date.now() + waitTime;

        // Schedule queue processing after rate limit expires
        setTimeout(() => {
          if (isRateLimited) {
            isRateLimited = false;
            processQueue();
          }
        }, waitTime);
      }

      // Create a specific error for rate limiting so React Query can handle it differently
      const rateLimitError = new Error('API Error: 429') as Error & { isRateLimited: boolean; retryAfter: number };
      rateLimitError.isRateLimited = true;
      rateLimitError.retryAfter = waitTime;
      return Promise.reject(rateLimitError);
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
