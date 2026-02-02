'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { isSessionExpiredError } from '@/api/api-client';

export default function QueryProvider({ children }: { children: ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        // With SSR, we usually want to set some default staleTime
                        // above 0 to avoid refetching immediately on the client
                        staleTime: 60 * 60 * 1000, // 1 hour
                        // Keep data in cache for 10 minutes after it becomes unused
                        gcTime: 10 * 60 * 1000, // 10 minutes
                        // Retry on failure, but not for session expired errors
                        retry: (failureCount, error) => {
                            if (isSessionExpiredError(error)) {
                                return false;
                            }
                            return failureCount < 2;
                        },
                        // Don't refetch when component remounts (data is still fresh)
                        refetchOnMount: false,
                        // Optional: customize based on preference
                        refetchOnWindowFocus: false,
                    },
                    mutations: {
                        // Don't retry mutations on session expired errors
                        retry: (failureCount, error) => {
                            if (isSessionExpiredError(error)) {
                                return false;
                            }
                            return false; // Default: don't retry mutations
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
