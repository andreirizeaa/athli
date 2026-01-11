import axios from 'axios';
import { supabase } from './supabase';
import Constants from 'expo-constants';

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

    // Get the current session from Supabase
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
      console.log('[API] Auth token added');
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
  (error) => {
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

    // Handle 401 Unauthorized globally if needed
    if (error.response?.status === 401) {
      console.warn('[API] Unauthorized access - session may be expired');
      // Could trigger a re-authentication flow here if needed
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
