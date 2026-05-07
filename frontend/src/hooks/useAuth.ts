"use client";

import { useAuthStore } from "@/store/authStore";

export const useAuth = () => {
  return useAuthStore();
};
