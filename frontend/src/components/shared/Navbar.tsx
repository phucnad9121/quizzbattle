"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, LogOut, Menu, User, X } from "lucide-react";

import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";

const navLinks = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "My Quizzes", href: "/quiz" },
];

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isFetchingUser, setIsFetchingUser] = useState(false);

  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    if (!accessToken || user || isFetchingUser) {
      return;
    }

    const fetchUser = async () => {
      setIsFetchingUser(true);
      try {
        const response = await apiClient.get("/users/me");
        setUser(response.data);
      } catch {
        // Ignore fetch errors, user can re-login if needed.
      } finally {
        setIsFetchingUser(false);
      }
    };

    void fetchUser();
  }, [accessToken, isFetchingUser, setUser, user]);

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    try {
      if (refreshToken) {
        await apiClient.post(
          "/auth/logout",
          { refresh_token: refreshToken },
          { _skipRefresh: true }
        );
      }
    } catch {
      // Ignore logout API errors; UX requires clearing local state anyway.
    } finally {
      logout();
      router.push("/login");
    }
  };

  const username = user?.username ?? "User";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md border border-border bg-background p-2 text-foreground md:hidden"
            aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
          <Link href="/dashboard" className="text-lg font-semibold text-foreground">
            QuizBattle
          </Link>
        </div>

        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm font-medium transition-colors",
                pathname.startsWith(link.href)
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 text-sm text-foreground md:flex">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <User className="h-4 w-4" />
            </span>
            <span>{username}</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} disabled={isLoggingOut}>
            {isLoggingOut ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="mr-2 h-4 w-4" />
            )}
            Logout
          </Button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-border bg-background px-4 py-3 md:hidden">
          <div className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "text-sm font-medium transition-colors",
                  pathname.startsWith(link.href) ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="flex items-center gap-2 text-sm text-foreground">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <User className="h-4 w-4" />
              </span>
              <span>{username}</span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
