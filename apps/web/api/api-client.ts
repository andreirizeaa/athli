import axiosInstance, { SessionExpiredError } from '@/lib/axios';

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
export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
    authenticated?: boolean;
    params?: Record<string, any>;
    body?: RequestInit['body'] | Record<string, unknown>;
}

// Re-export SessionExpiredError for consumers to check against
export { SessionExpiredError };

/**
 * Check if an error is a session expired error
 */
export const isSessionExpiredError = (error: unknown): boolean => {
    if (error instanceof SessionExpiredError) {
        return true;
    }
    if (error && typeof error === 'object') {
        return (error as any).isSessionExpired === true || 
               (error as any).name === 'SessionExpiredError';
    }
    return false;
};

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
    const body = fetchOptions.body;

    const headers = {
        ...(fetchOptions.headers as any),
    };

    // If body is NOT FormData, default Content-Type to application/json
    if (body && !(body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    try {
        const response = await axiosInstance.request<T>({
            url: endpoint,
            method: fetchOptions.method || 'GET',
            data: body,
            params: params,
            headers: headers,
            // Pass authenticated flag to interceptor via custom config
            skipAuth: !authenticated,
        } as any);

        // Backend seems to return { success, message, data: { user: ... } } 
        // Axios wraps this in data, so response.data is the actual payload.
        // However, existing calls expect `data.data.user` or similar.
        // Let's check user-service usage:
        // const data = await apiFetch('/user/me'); -> returns full response object
        // return data.data.user;

        return response.data;
    } catch (error: any) {
        // If it's a session expired error, re-throw it silently (dialog is already shown)
        if (isSessionExpiredError(error)) {
            throw error;
        }
        
        if (error.response && error.response.data) {
            // If the server returned an error message, throw that
            const serverError = error.response.data;
            throw new Error(serverError.message || serverError.error || `API Error: ${error.response.status}`);
        }
        throw error;
    }
}
