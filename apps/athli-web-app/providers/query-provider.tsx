'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode } from 'react';

export default function QueryProvider({ children }: { children: ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        // With SSR, we usually want to set some default staleTime
                        // above 0 to avoid refetching immediately on the client
                        staleTime: 5 * 60 * 1000, // 5 minutes
                        // Keep data in cache for 10 minutes after it becomes unused
                        gcTime: 10 * 60 * 1000, // 10 minutes
                        // Retry twice on failure
                        retry: 2,
                        // Don't refetch when component remounts (data is still fresh)
                        refetchOnMount: false,
                        // Optional: customize based on preference
                        refetchOnWindowFocus: false,
                    },
                },
            })
    );

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
    );
}
