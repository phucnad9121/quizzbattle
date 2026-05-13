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
  isInitializing: boolean;
  setUser: (user: AuthUser | null) => void;
  setTokens: (tokens: AuthTokens) => void;
  logout: (reason?: string) => void;
  initialize: () => Promise<void>;
};

const setAuthCookies = (accessToken: string | null, refreshToken: string | null) => {
  if (typeof document === "undefined") return;

  const base = "Path=/";
  if (!accessToken) {
    document.cookie = `qb_access_token=; Max-Age=0; ${base}`;
  } else {
    document.cookie = `qb_access_token=${accessToken}; Max-Age=1800; ${base}`;
  }

  if (!refreshToken) {
    document.cookie = `qb_refresh_token=; Max-Age=0; ${base}`;
  } else {
    document.cookie = `qb_refresh_token=${refreshToken}; Max-Age=604800; ${base}`;
  }
};

const decodeJwt = (token: string): { exp?: number } | null => {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload;
  } catch {
    return null;
  }
};

const isTokenExpired = (token: string | null) => {
  if (!token) return true;
  const payload = decodeJwt(token);
  if (!payload?.exp) return true;
  return Date.now() / 1000 >= payload.exp - 10; // Margin 10s
};

const refreshTokens = async (refreshToken: string): Promise<TokenPair> => {
  const response = await axios.post<TokenPair>(
    `${API_BASE_URL}/auth/refresh`,
    null,
    { headers: { Authorization: `Bearer ${refreshToken}` } }
  );
  return response.data;
};

let isInitRunning = false;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,
      isInitializing: false,
      setUser: (user) => set({ user }),
      setTokens: (tokens) =>
        set(() => {
          setAuthCookies(tokens.accessToken, tokens.refreshToken);
          return {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            isAuthenticated: Boolean(tokens.accessToken),
          };
        }),
      logout: (reason) => {
        console.warn(`[Auth] Logout called. Reason: ${reason || "none"}`);
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
          isInitializing: false,
        });
        setAuthCookies(null, null);
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      },
      initialize: async () => {
        if (typeof window === "undefined" || isInitRunning) return;

        isInitRunning = true;
        set({ isInitializing: true, isLoading: true });
        
        try {
          await useAuthStore.persist.rehydrate();
          
          let { accessToken, refreshToken } = get();

          // Fallback manual read
          if (!accessToken || !refreshToken) {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (raw) {
              try {
                const parsed = JSON.parse(raw);
                if (parsed.state) {
                  accessToken = accessToken || parsed.state.accessToken;
                  refreshToken = refreshToken || parsed.state.refreshToken;
                }
              } catch (e) {
                console.error("[Auth] LocalStorage fallback failed", e);
              }
            }

            // Cookie fallback
            if (!accessToken || !refreshToken) {
              const getCookie = (name: string) => {
                const value = `; ${document.cookie}`;
                const parts = value.split(`; ${name}=`);
                if (parts.length === 2) return parts.pop()?.split(";").shift();
                return null;
              };

              const cookieAccess = getCookie("qb_access_token");
              const cookieRefresh = getCookie("qb_refresh_token");

              if (cookieAccess || cookieRefresh) {
                accessToken = accessToken || cookieAccess || null;
                refreshToken = refreshToken || cookieRefresh || null;
              }
            }

            if (accessToken || refreshToken) {
              set({ accessToken, refreshToken });
            }
          }

          if (isTokenExpired(accessToken) && refreshToken) {
            try {
              const tokenPair = await refreshTokens(refreshToken);
              accessToken = tokenPair.access_token;
              refreshToken = tokenPair.refresh_token;
              setAuthCookies(accessToken, refreshToken);
              set({ accessToken, refreshToken, isAuthenticated: true });
            } catch (err) {
              console.error("[Auth] Token refresh failed during init", err);
              get().logout("Refresh failed during init");
              return;
            }
          }

          if (accessToken && !isTokenExpired(accessToken)) {
            setAuthCookies(accessToken, refreshToken);
            set({ accessToken, refreshToken, isAuthenticated: true });
            
            try {
              const response = await axios.get<AuthUser>(`${API_BASE_URL}/users/me`, {
                headers: { Authorization: `Bearer ${accessToken}` },
              });
              set({ user: response.data, isLoading: false, isInitializing: false });
            } catch (error) {
              console.error("[Auth] Profile fetch failed", error);
              if (axios.isAxiosError(error) && error.response?.status === 401) {
                get().logout("Unauthorized fetch profile");
              } else {
                set({ isLoading: false, isInitializing: false });
              }
            }
          } else {
            set({ 
              isAuthenticated: false, 
              isLoading: false, 
              isInitializing: false,
              user: null, 
              accessToken: null, 
              refreshToken: null 
            });
            setAuthCookies(null, null);
          }
        } catch (error) {
          console.error("[Auth] Critical initialization error", error);
          set({ isLoading: false, isInitializing: false, isAuthenticated: false });
        }
      },
    }),
    {
      name: STORAGE_KEY,
      skipHydration: true,
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated, // LƯU THÊM TRẠNG THÁI NÀY
      }),
    }
  )
);
