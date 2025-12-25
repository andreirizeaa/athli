import axiosInstance from '@/lib/axios';

/**
 * URL and API configuration
 */
export const API_URL = axiosInstance.defaults.baseURL;

/**
 * Common API Response wrapper
 */
export interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
}

/**
 * Enhanced fetch options for the API client
 */
export interface ApiRequestOptions extends RequestInit {
    authenticated?: boolean;
    params?: Record<string, any>;
}

/**
 * Unified API fetch utility using Axios
 * - Automatically injects JWT token (via axios interceptor)
 * - Handles JSON serialization/deserialization
 * - Provides unified error handling
 */
export async function apiFetch<T = any>(
    endpoint: string,
    options: ApiRequestOptions = {}
): Promise<T> {
    const { authenticated = true, params, ...fetchOptions } = options;

    try {
        const response = await axiosInstance.request<T>({
            url: endpoint,
            method: fetchOptions.method || 'GET',
            data: fetchOptions.body,
            params: params,
            headers: fetchOptions.headers as any,
            // You can pass custom config to interceptors if needed, 
            // but for now we rely on the interceptor logic checking for session.
        });

        // Backend seems to return { success, message, data: { user: ... } } 
        // Axios wraps this in data, so response.data is the actual payload.
        // However, existing calls expect `data.data.user` or similar.
        // Let's check user-service usage:
        // const data = await apiFetch('/user/me'); -> returns full response object
        // return data.data.user;

        return response.data;
    } catch (error: any) {
        if (error.response && error.response.data) {
            // If the server returned an error message, throw that
            const serverError = error.response.data;
            throw new Error(serverError.message || `API Error: ${error.response.status}`);
        }
        throw error;
    }
}
