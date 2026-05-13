"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

export function AuthInitializer() {
  const initialize = useAuthStore((state) => state.initialize);
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      await initialize();
      
      // Nếu đã xác thực mà vẫn ở trang login/register thì tự động đẩy về dashboard
      const { isAuthenticated } = useAuthStore.getState();
      const pathname = window.location.pathname;
      
      if (isAuthenticated && (pathname === "/login" || pathname === "/register")) {
        router.replace("/dashboard");
      }
    };
    init();
  }, [initialize, router]);

  return null;
}
