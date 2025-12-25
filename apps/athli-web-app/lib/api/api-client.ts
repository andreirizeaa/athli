import { createClient } from '@/lib/supabase/client';

/**
 * URL and API configuration
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') || 'http://localhost:3000';
const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION?.replace(/^\/+|\/+$/g, '') || 'api/v1';

/**
 * The full API URL constructed from environment variables
 */
export const API_URL = `${API_BASE_URL}/${API_VERSION}`;

/**
 * Get the current Supabase access token
 */
export async function getAccessToken(): Promise<string | null> {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
}

/**
 * Enhanced fetch options for the API client
 */
export interface ApiRequestOptions extends RequestInit {
    authenticated?: boolean;
}

/**
 * Common API Response wrapper
 */
export interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
}

/**
 * Unified API fetch utility
 * - Prepends the API base URL and version
 * - Automatically injects JWT token if authenticated
 * - Handles JSON serialization/deserialization
 * - Provides unified error handling
 */
export async function apiFetch<T = any>(
    endpoint: string,
    options: ApiRequestOptions = {}
): Promise<T> {
    const { authenticated = true, ...fetchOptions } = options;

    // Construct the full URL
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${API_URL}${path}`;

    // Build headers
    const headers = new Headers(fetchOptions.headers);
    if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    // Inject JWT token if required
    if (authenticated) {
        const token = await getAccessToken();
        if (token) {
            headers.set('Authorization', `Bearer ${token}`);
        }
    }

    try {
        const response = await fetch(url, {
            ...fetchOptions,
            headers,
        });

        // Parse JSON response
        let data;
        try {
            data = await response.json();
        } catch {
            // Handle cases where response is not JSON
            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }
            return {} as T;
        }

        if (!response.ok) {
            throw new Error(data.message || `API Error: ${response.status} ${response.statusText}`);
        }

        return data;
    } catch (error) {
        // Handle network errors or other issues
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('An unexpected error occurred during the API request');
    }
}
