"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { LoginForm } from "@/components/auth/LoginForm";
import { useAuthStore } from "@/store/authStore";

export default function LoginPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && !isLoading && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, isLoading, router, isMounted]);

  if (!isMounted || isLoading || isAuthenticated) {
    return null;
  }



  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="flex w-full max-w-md flex-col gap-6">
        <LoginForm />
        <p className="text-center text-sm text-muted-foreground">
          Chưa có tài khoản?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Đăng ký
          </Link>
        </p>
      </div>
    </main>
  );
}
