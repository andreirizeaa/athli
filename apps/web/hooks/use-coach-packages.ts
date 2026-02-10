import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { CoachPackage, Coupon } from '@athli/shared-types';
import {
  getCoachPackages,
  syncPackages,
  getStripeConnectionStatus,
  startStripeOnboarding,
  getStripeDashboardLink,
  disconnectStripe,
  createPackage,
  updatePackage,
  deletePackage,
  togglePackage,
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getCoachOnboardings,
  getCoachSequences,
  type CreatePackageData,
  type CreateCouponData,
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

  const disconnectMutation = useMutation({
    mutationFn: () => disconnectStripe(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stripe-connection'] });
      queryClient.invalidateQueries({ queryKey: ['coach-packages'] });
    },
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
    disconnectStripe: disconnectMutation.mutateAsync,
    isDisconnecting: disconnectMutation.isPending,
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

export const useCoupons = () => {
  const queryClient = useQueryClient();

  const couponsQuery = useQuery({
    queryKey: ['coupons'],
    queryFn: () => getCoupons(),
    staleTime: 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateCouponData) => createCoupon(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateCouponData & { is_active: boolean }> }) =>
      updateCoupon(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCoupon(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, value }: { id: string; value: boolean }) =>
      updateCoupon(id, { is_active: value }),
    onMutate: async ({ id, value }) => {
      await queryClient.cancelQueries({ queryKey: ['coupons'] });
      const previous = queryClient.getQueryData<Coupon[]>(['coupons']);
      queryClient.setQueryData<Coupon[]>(['coupons'], (old) =>
        old?.map((c) => (c.id === id ? { ...c, is_active: value } : c))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['coupons'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
    },
  });

  return {
    coupons: couponsQuery.data || [],
    isLoading: couponsQuery.isLoading,
    createCoupon: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateCoupon: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteCoupon: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    toggleCoupon: toggleMutation.mutateAsync,
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
