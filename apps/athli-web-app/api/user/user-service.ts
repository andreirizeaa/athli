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
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface UpdateProfileInput {
    name?: string;
    profilePictureUrl?: string | null;
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
    const data = await apiFetch('/user/me', {
        method: 'PATCH',
        body: JSON.stringify(updates),
    });
    return data.data.user;
}

/**
 * Upload profile picture to Supabase Storage
 */
export async function uploadProfilePicture(file: File, userId: string): Promise<string> {
    const supabase = createClient();

    // Validate file type
    if (!file.type.startsWith('image/')) {
        throw new Error('File must be an image');
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        throw new Error('Image size must be less than 5MB');
    }

    // Upload to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(filePath, file, { upsert: true });

    if (uploadError) {
        throw new Error(uploadError.message);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(filePath);

    return publicUrl;
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
