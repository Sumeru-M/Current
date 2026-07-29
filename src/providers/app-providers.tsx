"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * The QueryClient is created inside component state, not at module scope.
 * At module scope it would be shared across requests during SSR and leak one
 * user's cache into another's response — a real, shipped-to-production class of
 * bug rather than a theoretical one.
 */
const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // Live telemetry sets its own shorter staleTime per-hook; editorial
        // content (venues, offers) is happy to be a minute old.
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        retry: 1,
        refetchOnWindowFocus: true,
      },
      mutations: { retry: 0 },
    },
  });

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
