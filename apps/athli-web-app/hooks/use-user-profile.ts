import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabaseAuth } from '@/lib/providers/supabase-auth-provider';
import { getUserProfile, updateUserProfile, getUserProfileSafe } from '@/api/user/user-service';

export interface UpdateProfileInput {
  name?: string;
  profilePictureUrl?: string | null;
  avatarFile?: File | null;
}

export function useUserProfile() {
  const { user: authUser, refreshUser, isLoading: isAuthLoading, supabaseUser } = useSupabaseAuth();
  const queryClient = useQueryClient();

  // Query for fetching user profile
  // We use the authUser.id as part of the key to ensure we fetch correctly when user changes
  const {
    data: userProfile,
    isLoading,
    error
  } = useQuery({
    queryKey: ['user-profile', authUser?.id],
    queryFn: () => {
      // If we have the supabase user from context, use the safe fetcher
      // Otherwise fall back to the standard one
      if (supabaseUser) {
        return getUserProfileSafe(supabaseUser);
      }
      return getUserProfile();
    },
    enabled: !!authUser, // Only run if authenticated
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutation for updating profile
  const updateProfileMutation = useMutation({
    mutationFn: async (updates: UpdateProfileInput) => {
      const result = await updateUserProfile(updates);
      // Also optionally refresh Supabase Auth user metadata if needed
      await refreshUser();
      return result;
    },
    onSuccess: (data) => {
      // Update query cache with new data
      queryClient.setQueryData(['user-profile', authUser?.id], data);
    },
  });

  // Mutation for uploading profile picture (now handled via updateUserProfile)
  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!authUser) throw new Error('No user');
      const result = await updateUserProfile({ avatarFile: file });
      await refreshUser();
      return result.profilePictureUrl || '';
    },
    onSuccess: (publicUrl) => {
      // Update query cache with new data
      queryClient.invalidateQueries({ queryKey: ['user-profile', authUser?.id] });
    },
  });

  return {
    user: userProfile || authUser, // Fallback to authUser if query not ready or structure matches
    isLoading: isAuthLoading || isLoading || updateProfileMutation.isPending || uploadImageMutation.isPending,
    isUpdating: updateProfileMutation.isPending,
    isUploadingImage: uploadImageMutation.isPending,
    error: error || updateProfileMutation.error || uploadImageMutation.error,
    updateProfile: (updates: UpdateProfileInput) => updateProfileMutation.mutateAsync(updates),
    uploadAndSetProfilePicture: (file: File) => uploadImageMutation.mutateAsync(file),
  };
}
