import { createClient } from '@/supabase/client';
import { apiFetch } from '@/api/api-client';
import type { User } from '@supabase/supabase-js';

export interface UserProfile {
    id: string;
    publicId: string;
    email: string;
    name: string;
    userType: 'coach' | 'client';
    profilePictureUrl?: string | null;
    signinMethod: 'email' | 'google';
    timezone?: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    // Coach-specific fields
    freeTrialCompleted?: boolean;
    coachCreatedAt?: string; // When coach profile was created (for trial calculation)
}

export interface UpdateProfileInput {
    name?: string;
    profilePictureUrl?: string | null;
    avatarFile?: File | null;
    timezone?: string;
}

/**
 * Get current user profile from backend API
 */
export async function getUserProfile(): Promise<UserProfile> {
    const data = await apiFetch('/user/me');
    return data.data.user;
}

/**
 * Get user profile safely - falls back to auth metadata if API fails
 * This is useful for initial load where race conditions might occur
 */
export async function getUserProfileSafe(authUser: User): Promise<UserProfile> {
    try {
        return await getUserProfile();
    } catch (error) {
        console.warn('Failed to fetch user profile, falling back to metadata:', error);

        // Fallback to metadata
        return {
            id: authUser.id,
            publicId: '', // Not available in metadata
            userType: (authUser.user_metadata?.user_type as 'coach' | 'client') || 'coach',
            email: authUser.email || '',
            name: (authUser.user_metadata?.name as string) || '',
            profilePictureUrl: (authUser.user_metadata?.avatar_url as string) ||
                (authUser.user_metadata?.picture as string) || null,
            signinMethod: authUser.app_metadata?.provider === 'google' ? 'google' : 'email',
            timezone: (authUser.user_metadata?.timezone as string) || null,
            isActive: true, // Default to true since they are logged in
            createdAt: authUser.created_at || new Date().toISOString(),
            updatedAt: authUser.updated_at || new Date().toISOString(),
        };
    }
}

/**
 * Update user profile via backend API
 */
export async function updateUserProfile(updates: UpdateProfileInput): Promise<UserProfile> {
    let body: any = JSON.stringify(updates);

    if (updates.avatarFile) {
        const formData = new FormData();
        formData.append('avatar', updates.avatarFile);
        if (updates.name) formData.append('name', updates.name);
        if (updates.profilePictureUrl) formData.append('profilePictureUrl', updates.profilePictureUrl);
        if (updates.timezone) formData.append('timezone', updates.timezone);
        body = formData;
    }

    const data = await apiFetch('/user/me', {
        method: 'PATCH',
        body,
    });
    return data.data.user;
}


/**
 * Ensure client profile exists for current user
 */
export async function ensureClientProfile(coachId: string): Promise<UserProfile> {
    const data = await apiFetch('/user/ensure-client-profile', {
        method: 'POST',
        body: JSON.stringify({ coachId }),
    });
    return data.data.user;
}

/**
 * Ensure coach profile exists for current user
 */
export async function ensureCoachProfile(): Promise<UserProfile> {
    const data = await apiFetch('/user/ensure-coach-profile', {
        method: 'POST',
    });
    return data.data.user;
}

/**
 * Fetch user by ID (public endpoint, no authentication required)
 * Used for fetching coach information on invite pages
 */
export async function fetchUserById(userId: string): Promise<UserProfile> {
    const data = await apiFetch(`/user/fetch/${userId}`, {
        authenticated: false,
        cache: 'no-cache',
    });

    if (!data.data || !data.data.user) {
        throw new Error('Invalid response format from server');
    }
    return data.data.user;
}

/**
 * Seed demo client data for a new coach
 * Idempotent - only seeds if demo client doesn't exist
 */
export async function seedDemoData(): Promise<{ seeded: boolean }> {
    const data = await apiFetch('/user/seed-demo-data', {
        method: 'POST',
    });
    return data.data;
}

export async function seedScreenshotData(): Promise<{ clientsCreated: number }> {
    const data = await apiFetch('/user/seed-screenshot-data', {
        method: 'POST',
    });
    return data.data;
}

export async function cleanScreenshotData(): Promise<{ clientsRemoved: number }> {
    const data = await apiFetch('/user/clean-screenshot-data', {
        method: 'POST',
    });
    return data.data;
}
