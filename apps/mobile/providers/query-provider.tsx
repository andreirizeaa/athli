import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { haptics } from '@/utils/haptics';

export default function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        // React Query v5: Use QueryCache and MutationCache for global error handlers
        // (defaultOptions.onError was removed in v5)
        queryCache: new QueryCache({
          onError: (error) => {
            console.error('[Query Error]', error.message);
          },
        }),
        mutationCache: new MutationCache({
          onError: (error) => {
            console.error('[Mutation Error]', error.message);
            // Provide haptic feedback for failed operations
            haptics.error();
          },
        }),
        defaultOptions: {
          queries: {
            // Mobile-optimized settings
            throwOnError: true, // Throw errors during render to trigger ErrorBoundary
            staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh longer on mobile
            gcTime: 10 * 60 * 1000, // 10 minutes - keep data in cache
            retry: 2, // Retry twice on failure
            refetchOnMount: false, // Don't refetch when component remounts
            refetchOnWindowFocus: false, // Mobile doesn't have window focus
            refetchOnReconnect: true, // Refetch when network reconnects
          },
          mutations: {
            throwOnError: true, // Throw errors during render to trigger ErrorBoundary
            retry: 1, // Retry mutations once on failure
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
