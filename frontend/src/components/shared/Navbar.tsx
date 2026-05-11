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
    <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-black/40 backdrop-blur-2xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 p-2 text-white md:hidden"
            aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:rotate-6 transition-transform">
               <span className="text-xl font-black text-white italic">Q</span>
            </div>
            <span className="text-2xl font-black italic tracking-tighter text-white uppercase group-hover:text-indigo-400 transition-colors">
              QuizBattle
            </span>
          </Link>
        </div>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm font-black uppercase italic tracking-widest transition-all hover:scale-105",
                pathname.startsWith(link.href)
                  ? "text-indigo-400"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-6">
          <div className="hidden items-center gap-3 text-sm font-bold text-white md:flex bg-white/5 px-4 py-2 rounded-2xl border border-white/5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 text-white shadow-lg shadow-indigo-500/20">
              <User className="h-4 w-4" />
            </span>
            <span className="max-w-[120px] truncate">{username}</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLogout} 
            disabled={isLoggingOut}
            className="h-11 px-5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/5 transition-all font-bold uppercase tracking-widest text-[10px]"
          >
            {isLoggingOut ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="mr-2 h-4 w-4" />
            )}
            Đăng xuất
          </Button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-white/5 bg-black/90 backdrop-blur-3xl px-6 py-6 md:hidden animate-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "text-lg font-black uppercase italic tracking-widest transition-colors",
                  pathname.startsWith(link.href) ? "text-indigo-400" : "text-zinc-400"
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="h-px bg-white/5 w-full" />
            <div className="flex items-center gap-3 text-white">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500 text-white">
                <User className="h-5 w-5" />
              </span>
              <span className="font-bold text-lg">{username}</span>
            </div>
          </div>
        </div>
      )}
    </header>

  );
}
