import { createClient } from '@/lib/supabase/client';

// API base URL - should NOT include /api/v1 path
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const API_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, ''); // Remove /api/v1 if present

interface UpdateProfileInput {
  name?: string;
  profilePictureUrl?: string | null;
}

interface UserProfile {
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
 * Get the Supabase access token for API requests
 */
async function getAccessToken(): Promise<string> {
  const supabase = createClient();
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session) {
    throw new Error('Not authenticated');
  }

  return session.access_token;
}

/**
 * Get current user profile from backend API
 */
export async function getUserProfile(): Promise<UserProfile> {
  const token = await getAccessToken();

  const response = await fetch(`${API_URL}/api/v1/user/me`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch profile' }));
    throw new Error(error.message || 'Failed to fetch profile');
  }

  const data = await response.json();
  return data.data.user;
}

/**
 * Update user profile via backend API
 */
export async function updateUserProfile(updates: UpdateProfileInput): Promise<UserProfile> {
  const token = await getAccessToken();

  const response = await fetch(`${API_URL}/api/v1/user/me`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to update profile' }));
    throw new Error(error.message || 'Failed to update profile');
  }

  const data = await response.json();
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
  const token = await getAccessToken();

  const response = await fetch(`${API_URL}/api/v1/user/ensure-client-profile`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ coachId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to ensure client profile' }));
    throw new Error(error.message || 'Failed to ensure client profile');
  }

  const data = await response.json();
  return data.data.user;
}
