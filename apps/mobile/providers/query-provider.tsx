import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { haptics } from '@/utils/haptics';

// Check if error is a rate limit error (axios layer will handle retry)
const isRateLimitError = (error: unknown): boolean => {
  return (error as any)?.isRateLimited === true || (error as any)?.message?.includes('429');
};

export default function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        // React Query v5: Use QueryCache and MutationCache for global error handlers
        // (defaultOptions.onError was removed in v5)
        queryCache: new QueryCache({
          onError: (error) => {
            // Don't log rate limit errors - they're handled by axios
            if (!isRateLimitError(error)) {
              console.error('[Query Error]', error.message);
            }
          },
        }),
        mutationCache: new MutationCache({
          onError: (error) => {
            // Don't log rate limit errors - they're handled by axios
            if (!isRateLimitError(error)) {
              console.error('[Mutation Error]', error.message);
              // Provide haptic feedback for failed operations
              haptics.error();
            }
          },
        }),
        defaultOptions: {
          queries: {
            // Mobile-optimized settings
            throwOnError: (error) => !isRateLimitError(error), // Don't throw on rate limit
            staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh longer on mobile
            gcTime: 10 * 60 * 1000, // 10 minutes - keep data in cache
            retry: (failureCount, error) => {
              // Don't retry rate limit errors - axios handles this
              if (isRateLimitError(error)) return false;
              // Retry other errors twice
              return failureCount < 2;
            },
            refetchOnMount: false, // Don't refetch when component remounts
            refetchOnWindowFocus: false, // Mobile doesn't have window focus
            refetchOnReconnect: true, // Refetch when network reconnects
          },
          mutations: {
            throwOnError: (error) => !isRateLimitError(error), // Don't throw on rate limit
            retry: (failureCount, error) => {
              // Don't retry rate limit errors
              if (isRateLimitError(error)) return false;
              return failureCount < 1;
            },
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
