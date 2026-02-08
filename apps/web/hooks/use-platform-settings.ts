import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabaseAuth } from '@/lib/providers/supabase-auth-provider';
import { getCoachPreferences, updateCoachPreferences, type CoachPreferences } from '@/api/settings/coach/coach-preferences-service';
import { getCoachCompany, updateCoachCompany, uploadCompanyLogo, type CoachCompanyInfo } from '@/api/settings/coach/coach-company-service';
import { getCoachNotificationPreferences, updateCoachNotificationPreference, batchUpdateCoachNotificationPreferences, type NotificationPreference } from '@/api/settings/coach/coach-notifications-service';
import { getCoachUniqueCode } from '@/api/settings/coach/coach-code-service';

export function usePlatformSettings() {
    const { user, isLoading: isAuthLoading } = useSupabaseAuth();
    const queryClient = useQueryClient();
    const isEnabled = !!user;

    // --- PREFERENCES ---
    const preferencesQuery = useQuery({
        queryKey: ['coach-preferences', user?.id],
        queryFn: getCoachPreferences,
        enabled: isEnabled,
        staleTime: 5 * 60 * 1000,
    });

    const updatePreferencesMutation = useMutation({
        mutationFn: updateCoachPreferences,
        onSuccess: (data) => {
            // Optimistically update or just allow refetch
            queryClient.setQueryData(['coach-preferences', user?.id], data);
            preferencesQuery.refetch();
        },
    });

    // --- COMPANY INFO ---
    const companyQuery = useQuery({
        queryKey: ['coach-company', user?.id],
        queryFn: async () => {
            try {
                const result = await getCoachCompany();
                return result?.data?.company || result?.data || result; // handle variance in response structure
            } catch (err: any) {
                // If 404, return null (indicating no company set up yet)
                if (err.message && err.message.includes('404')) {
                    return null;
                }
                // If specifically handled in api-client to throw, catch here.
                // Assumption: apiFetch might throw on 404, check api-client.ts or just return null if "not found"
                return null;
            }
        },
        enabled: isEnabled,
        staleTime: 5 * 60 * 1000,
        retry: false, // Don't retry if it's a 404
    });

    const updateCompanyMutation = useMutation({
        mutationFn: updateCoachCompany,
        onSuccess: (data) => {
            queryClient.setQueryData(['coach-company', user?.id], data);
            companyQuery.refetch();
        },
    });

    const uploadCompanyLogoMutation = useMutation({
        mutationFn: async (file: File) => {
            if (!user) throw new Error('No user');
            const publicUrl = await uploadCompanyLogo(file, user.id);
            await updateCompanyMutation.mutateAsync({ logo_url: publicUrl });
            return publicUrl;
        },
        onSuccess: () => {
            // Refetch or update query data is already handled by updateCompanyMutation's onSuccess
            companyQuery.refetch();
        },
    });

    // --- NOTIFICATION PREFERENCES ---
    const notificationPrefsQuery = useQuery({
        queryKey: ['coach-notification-preferences', user?.id],
        queryFn: async () => {
            const res = await getCoachNotificationPreferences();
            return res.data?.preferences || [];
        },
        enabled: isEnabled,
        staleTime: 5 * 60 * 1000,
    });

    const updateNotificationPrefMutation = useMutation({
        mutationFn: async ({ notificationType, inAppEnabled, pushEnabled }: { notificationType: string; inAppEnabled?: boolean; pushEnabled?: boolean }) => {
            return updateCoachNotificationPreference(notificationType, { inAppEnabled, pushEnabled });
        },
        onSuccess: () => {
            notificationPrefsQuery.refetch();
        },
    });

    const batchUpdateNotificationPrefsMutation = useMutation({
        mutationFn: async (preferences: Array<{ notificationType: string; inAppEnabled?: boolean; pushEnabled?: boolean }>) => {
            return batchUpdateCoachNotificationPreferences(preferences);
        },
        onSuccess: () => {
            notificationPrefsQuery.refetch();
        },
    });

    // --- UNIQUE CODE ---
    const uniqueCodeQuery = useQuery({
        queryKey: ['coach-unique-code', user?.id],
        queryFn: async () => {
            const res = await getCoachUniqueCode();
            return res.data?.code || null;
        },
        enabled: isEnabled,
        staleTime: Infinity, // Code should never change
    });

    return {
        preferences: preferencesQuery.data,
        company: companyQuery.data, // null if not set up
        notificationPreferences: notificationPrefsQuery.data || [],
        uniqueCode: uniqueCodeQuery.data || null,

        isLoading: isAuthLoading || preferencesQuery.isLoading || companyQuery.isLoading || notificationPrefsQuery.isLoading || uniqueCodeQuery.isLoading,
        isUploadingLogo: uploadCompanyLogoMutation.isPending,
        isUpdatingCompany: updateCompanyMutation.isPending,

        updatePreferences: updatePreferencesMutation.mutateAsync,
        updateCompany: updateCompanyMutation.mutateAsync,
        uploadAndSetCompanyLogo: uploadCompanyLogoMutation.mutateAsync,
        updateNotificationPreference: updateNotificationPrefMutation.mutateAsync,
        batchUpdateNotificationPreferences: batchUpdateNotificationPrefsMutation.mutateAsync,
    };
}
