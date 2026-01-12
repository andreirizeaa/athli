import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

export default function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Mobile-optimized settings
            staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh longer on mobile
            gcTime: 10 * 60 * 1000, // 10 minutes - keep data in cache
            retry: 2, // Retry twice on failure
            refetchOnMount: false, // Don't refetch when component remounts
            refetchOnWindowFocus: false, // Mobile doesn't have window focus
            refetchOnReconnect: true, // Refetch when network reconnects
          },
          mutations: {
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
