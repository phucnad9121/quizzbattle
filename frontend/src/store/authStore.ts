import axios from "axios";
import { create } from "zustand";
import { persist } from "zustand/middleware";

const STORAGE_KEY = "quizbattle.auth";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AuthTokens = {
  accessToken: string | null;
  refreshToken: string | null;
};

type TokenPair = {
  access_token: string;
  refresh_token: string;
};

export type AuthState = AuthTokens & {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: AuthUser | null) => void;
  setTokens: (tokens: AuthTokens) => void;
  logout: () => void;
  initialize: () => Promise<void>;
};

const setAccessTokenCookie = (token: string | null) => {
  if (typeof document === "undefined") {
    return;
  }

  if (!token) {
    document.cookie = "access_token=; Path=/; Max-Age=0; SameSite=Lax";
    return;
  }

  document.cookie = `access_token=${token}; Path=/; Max-Age=1800; SameSite=Lax`;
};

const decodeJwt = (token: string): { exp?: number } | null => {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const payload = parts[1]
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(parts[1].length / 4) * 4, "=");

  try {
    const json =
      typeof window !== "undefined" && "atob" in window
        ? window.atob(payload)
        : Buffer.from(payload, "base64").toString("utf-8");
    return JSON.parse(json) as { exp?: number };
  } catch {
    return null;
  }
};

const isTokenExpired = (token: string | null) => {
  if (!token) {
    return true;
  }
  const payload = decodeJwt(token);
  if (!payload?.exp) {
    return true;
  }
  return Date.now() / 1000 >= payload.exp;
};

const refreshTokens = async (refreshToken: string): Promise<TokenPair> => {
  const response = await axios.post<TokenPair>(
    `${API_BASE_URL}/auth/refresh`,
    null,
    {
      headers: {
        Authorization: `Bearer ${refreshToken}`,
      },
    }
  );

  return response.data;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      setUser: (user) => set({ user }),
      setTokens: (tokens) =>
        set(() => {
          setAccessTokenCookie(tokens.accessToken);
          return {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            isAuthenticated: Boolean(tokens.accessToken),
          };
        }),
      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        });
        setAccessTokenCookie(null);
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      },
      initialize: async () => {
        if (typeof window === "undefined") {
          return;
        }

        set({ isLoading: true });
        await useAuthStore.persist.rehydrate();

        const { accessToken, refreshToken } = get();

        if (accessToken && !isTokenExpired(accessToken)) {
          setAccessTokenCookie(accessToken);
          set({ isAuthenticated: true, isLoading: false });
          return;
        }

        if (!refreshToken) {
          set({ isAuthenticated: false, isLoading: false, accessToken: null });
          return;
        }

        try {
          const tokenPair = await refreshTokens(refreshToken);
          setAccessTokenCookie(tokenPair.access_token);
          set({
            accessToken: tokenPair.access_token,
            refreshToken: tokenPair.refresh_token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
          });
          if (typeof window !== "undefined") {
            window.localStorage.removeItem(STORAGE_KEY);
          }
        }
      },
    }),
    {
      name: STORAGE_KEY,
      skipHydration: true,
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);
