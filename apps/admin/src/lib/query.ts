import { QueryClient } from '@tanstack/react-query';

/** Shared React Query client — server-state cache for the whole admin. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
