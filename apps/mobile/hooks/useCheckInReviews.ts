import { useQuery } from '@tanstack/react-query';
import { getCheckInReviews, type CheckInReview } from '@/services/coach/coach-check-in-service';

export const useCheckInReviews = (options?: { enabled?: boolean }) => {
  const {
    data: reviews = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['coach-check-in-reviews'],
    queryFn: getCheckInReviews,
    enabled: options?.enabled !== false,
  });

  return {
    reviews,
    reviewCount: reviews.length,
    isLoading,
    refetch,
  };
};
