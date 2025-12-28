import { createClient } from '@/supabase/client';
import { apiFetch } from '@/api/api-client';

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
