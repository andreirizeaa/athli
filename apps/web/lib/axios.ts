import axios from 'axios';
import { getCachedAccessToken } from '@/supabase/client';
import { authEvents } from '@/lib/auth-events';
import { rateLimitEvents } from '@/lib/rate-limit-events';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') || 'http://localhost:3002';
const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION?.replace(/^\/+|\/+$/g, '') || 'api/v1';

export const API_URL = `${API_BASE_URL}/${API_VERSION}`;

/**
 * Custom error class for session expired errors
 * Used to identify 401 errors that are handled by the session expired dialog
 * The message is intentionally empty to prevent toast messages from showing it
 */
export class SessionExpiredError extends Error {
    public readonly isSessionExpired = true;
    
    constructor() {
        super(''); // Empty message to prevent toasts from showing anything
        this.name = 'SessionExpiredError';
    }
}

const axiosInstance = axios.create({
    baseURL: API_URL,
    headers: {},
});

// Request interceptor to add Auth token
axiosInstance.interceptors.request.use(
    async (config) => {
        // Use cached access token to avoid hitting Supabase auth endpoint on every request
        const accessToken = await getCachedAccessToken();

        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for global error handling
axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        // Handle 429 Too Many Requests globally - show rate limit overlay
        if (error.response?.status === 429) {
            rateLimitEvents.emitRateLimited();
            return Promise.reject(error);
        }

        // Handle 401 Unauthorized globally - show session expired dialog
        if (error.response?.status === 401) {
            const errorData = error.response?.data;
            const isUnauthorized = errorData?.error?.code === 'UNAUTHORIZED' || 
                                   errorData?.code === 'UNAUTHORIZED' ||
                                   errorData?.message?.includes('Unauthorized');
            
            if (isUnauthorized) {
                // Emit event to show session expired dialog
                authEvents.emitSessionExpired();
                // Throw a SessionExpiredError so consuming code can identify and suppress toasts
                return Promise.reject(new SessionExpiredError());
            }
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
