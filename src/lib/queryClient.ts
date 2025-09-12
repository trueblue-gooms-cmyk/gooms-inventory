import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: (failureCount, error) => {
        // Don't retry for auth errors
        if (error?.message?.includes('JWT')) return false;
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
      refetchOnMount: 'always',
    },
    mutations: {
      retry: 1,
    },
  },
});