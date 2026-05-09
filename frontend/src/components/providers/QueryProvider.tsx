"use client";

import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";
import { AxiosError } from "axios";
import { useAuthStore } from "@/store/authStore";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error) => {
            if (error instanceof AxiosError && error.response?.status === 401) {
              useAuthStore.getState().logout();
              if (typeof window !== "undefined") {
                window.location.href = "/login";
              }
            }
          },
        }),
        mutationCache: new MutationCache({
          onError: (error) => {
            if (error instanceof AxiosError && error.response?.status === 401) {
              useAuthStore.getState().logout();
              if (typeof window !== "undefined") {
                window.location.href = "/login";
              }
            }
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes as per QB-039 requirements
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              // Don't retry on 401 as it's an auth error
              if (error instanceof AxiosError && error.response?.status === 401) {
                return false;
              }
              return failureCount < 2;
            },
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
