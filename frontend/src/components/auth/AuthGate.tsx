"use client";

import { useAuthStore } from "@/store/authStore";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const isLoading = useAuthStore((state) => state.isLoading);

  if (isLoading) {
    return null;
  }

  return <>{children}</>;
}
