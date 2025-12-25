import { useState } from 'react';
import { useSupabaseAuth } from '@/lib/providers/supabase-auth-provider';
import { updateUserProfile, uploadProfilePicture } from '@/lib/api/user/user-service';

interface UpdateProfileInput {
  name?: string;
  profilePictureUrl?: string | null;
}

export function useUserProfile() {
  const { user, refreshUser } = useSupabaseAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  /**
   * Update user profile
   */
  const updateProfile = async (updates: UpdateProfileInput) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    setIsUpdating(true);
    try {
      // Call backend API to update profile
      await updateUserProfile(updates);

      // Refresh user data in auth context
      await refreshUser();

      return true;
    } catch (error) {
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Upload profile picture and update profile
   */
  const uploadAndSetProfilePicture = async (file: File) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    setIsUploadingImage(true);
    try {
      // Upload image to Supabase Storage
      const publicUrl = await uploadProfilePicture(file, user.id);

      // Update profile with new image URL via backend API
      await updateProfile({ profilePictureUrl: publicUrl });

      return publicUrl;
    } catch (error) {
      throw error;
    } finally {
      setIsUploadingImage(false);
    }
  };

  return {
    user,
    isUpdating,
    isUploadingImage,
    updateProfile,
    uploadAndSetProfilePicture,
  };
}
