"use client";

import { useEffect } from "react";

import { useAuthStore } from "@/store/authStore";

export function AuthInitializer() {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  return null;
}
