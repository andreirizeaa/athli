import axios from 'axios';
import { createClient } from '@/supabase/client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') || 'http://localhost:3000';
const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION?.replace(/^\/+|\/+$/g, '') || 'api/v1';

export const API_URL = `${API_BASE_URL}/${API_VERSION}`;

const axiosInstance = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add Auth token
axiosInstance.interceptors.request.use(
    async (config) => {
        // Skip if no auth required (custom property check could be added here if we typed config)
        // For now, we assume most requests need auth, and Supabase client handles the session check efficiently.
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.access_token) {
            config.headers.Authorization = `Bearer ${session.access_token}`;
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
        // Handle 401 Unauthorized globally if needed (e.g., redirect to login)
        if (error.response?.status === 401) {
            console.warn('Unauthorized access - redirecting or handling session expiry');
            // Potential logic: window.location.href = '/login'; 
            // Note: Be careful with direct redirects in interceptors as it might loop or disrupt UX.
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
