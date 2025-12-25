/**
 * Service methods for fetching coach/user information
 */

// API base URL - should NOT include /api/v1 path
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const API_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, ''); // Remove /api/v1 if present

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  userType: 'coach' | 'client';
  profilePictureUrl?: string | null;
  signinMethod: 'email' | 'google';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetch user by ID (public endpoint, no authentication required)
 * Used for fetching coach information on invite pages
 */
export async function fetchUserById(userId: string): Promise<UserProfile> {
  const url = `${API_URL}/api/v1/user/fetch/${userId}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add cache control to avoid CORS preflight issues
      cache: 'no-cache',
    });

    if (!response.ok) {
      let errorMessage = `Failed to fetch user: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        // If response is not JSON, use status text
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    if (!data.data || !data.data.user) {
      throw new Error('Invalid response format from server');
    }
    return data.data.user;
  } catch (error) {
    // Handle network errors, CORS issues, etc.
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      // Check if we're in development and provide helpful error
      const isDev = process.env.NODE_ENV === 'development';
      const helpfulMessage = isDev
        ? `Unable to connect to API server at ${url}. Make sure the API server is running on port 3000.`
        : 'Unable to connect to the server. Please try again later.';
      throw new Error(helpfulMessage);
    }
    // Re-throw other errors as-is
    throw error;
  }
}

