import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { CoachPackage } from '@athli/shared-types';
import {
  getCoachPackages,
  syncPackages,
  getStripeConnectionStatus,
  startStripeOnboarding,
  getStripeDashboardLink,
  createPackage,
  updatePackage,
  deletePackage,
  togglePackage,
  getDiscountCodes,
  createDiscountCode,
  updateDiscountCode,
  deleteDiscountCode,
  getCoachOnboardings,
  getCoachSequences,
  type CreatePackageData,
  type CreateCodeData,
} from '@/api/payments/payment-service';

export const useStripeConnection = () => {
  return useQuery({
    queryKey: ['stripe-connection'],
    queryFn: () => getStripeConnectionStatus(),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useCoachPackages = () => {
  const queryClient = useQueryClient();

  const packagesQuery = useQuery({
    queryKey: ['coach-packages'],
    queryFn: () => getCoachPackages(),
    staleTime: 60 * 1000,
  });

  const syncMutation = useMutation({
    mutationFn: () => syncPackages(),
    onSuccess: (packages) => {
      queryClient.setQueryData(['coach-packages'], packages);
    },
  });

  const onboardMutation = useMutation({
    mutationFn: () => startStripeOnboarding(),
  });

  const dashboardLinkMutation = useMutation({
    mutationFn: () => getStripeDashboardLink(),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreatePackageData) => createPackage(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach-packages'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreatePackageData> }) => updatePackage(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach-packages'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePackage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach-packages'] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, field, value }: { id: string; field: 'is_active' | 'is_visible'; value: boolean }) =>
      togglePackage(id, field, value),
    onMutate: async ({ id, field, value }) => {
      await queryClient.cancelQueries({ queryKey: ['coach-packages'] });
      const previous = queryClient.getQueryData<CoachPackage[]>(['coach-packages']);
      queryClient.setQueryData<CoachPackage[]>(['coach-packages'], (old) =>
        old?.map((pkg) => (pkg.id === id ? { ...pkg, [field]: value } : pkg))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['coach-packages'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['coach-packages'] });
    },
  });

  return {
    packages: packagesQuery.data || [],
    isLoading: packagesQuery.isLoading,
    isSyncing: syncMutation.isPending,
    syncPackages: syncMutation.mutateAsync,
    startOnboarding: onboardMutation.mutateAsync,
    isOnboarding: onboardMutation.isPending,
    getDashboardLink: dashboardLinkMutation.mutateAsync,
    isGettingDashboardLink: dashboardLinkMutation.isPending,
    createPackage: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updatePackage: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deletePackage: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    togglePackage: toggleMutation.mutateAsync,
    isToggling: toggleMutation.isPending,
  };
};

export const useDiscountCodes = () => {
  const queryClient = useQueryClient();

  const codesQuery = useQuery({
    queryKey: ['discount-codes'],
    queryFn: () => getDiscountCodes(),
    staleTime: 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateCodeData) => createDiscountCode(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discount-codes'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateCodeData & { is_active: boolean }> }) =>
      updateDiscountCode(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discount-codes'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDiscountCode(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discount-codes'] });
    },
  });

  return {
    codes: codesQuery.data || [],
    isLoading: codesQuery.isLoading,
    createCode: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateCode: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteCode: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
};

export const useCoachOnboardings = () => {
  return useQuery({
    queryKey: ['coach-onboardings'],
    queryFn: () => getCoachOnboardings(),
    staleTime: 5 * 60 * 1000,
  });
};

export const useCoachSequencesDropdown = () => {
  return useQuery({
    queryKey: ['coach-sequences-dropdown'],
    queryFn: () => getCoachSequences(),
    staleTime: 5 * 60 * 1000,
  });
};
