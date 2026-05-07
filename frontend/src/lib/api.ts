import axios, { AxiosError, type AxiosRequestConfig } from "axios";

import { useAuthStore } from "@/store/authStore";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

type RetryConfig = AxiosRequestConfig & {
  _retry?: boolean;
  _skipRefresh?: boolean;
};

type FailedRequest = {
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
  config: RetryConfig;
};

let isRefreshing = false;
let failedRequestsQueue: FailedRequest[] = [];

const processQueue = (error: unknown, token: string | null) => {
  failedRequestsQueue.forEach(({ resolve, reject, config }) => {
    if (error) {
      reject(error);
      return;
    }

    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    }

    resolve(apiClient(config));
  });

  failedRequestsQueue = [];
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

apiClient.interceptors.request.use((config) => {
  const typedConfig = config as RetryConfig;
  const { accessToken } = useAuthStore.getState();

  if (config.headers?.Authorization) {
    return config;
  }

  if (accessToken && !typedConfig._skipRefresh) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${accessToken}`,
    };
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalConfig = error.config as RetryConfig | undefined;
    const status = error.response?.status;

    if (!originalConfig || status !== 401) {
      return Promise.reject(error);
    }

    if (originalConfig._skipRefresh || originalConfig._retry) {
      return Promise.reject(error);
    }

    if (originalConfig.url?.includes("/auth/refresh")) {
      return Promise.reject(error);
    }

    const { refreshToken } = useAuthStore.getState();
    if (!refreshToken) {
      useAuthStore.getState().logout();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedRequestsQueue.push({ resolve, reject, config: originalConfig });
      });
    }

    originalConfig._retry = true;
    isRefreshing = true;

    try {
      const response = await apiClient.post(
        "/auth/refresh",
        null,
        {
          headers: {
            Authorization: `Bearer ${refreshToken}`,
          },
          _skipRefresh: true,
        } as RetryConfig
      );

      const { access_token, refresh_token } = response.data as {
        access_token: string;
        refresh_token: string;
      };

      useAuthStore.getState().setTokens({
        accessToken: access_token,
        refreshToken: refresh_token,
      });

      processQueue(null, access_token);

      originalConfig.headers = {
        ...originalConfig.headers,
        Authorization: `Bearer ${access_token}`,
      };

      return apiClient(originalConfig);
    } catch (refreshError) {
      processQueue(refreshError, null);
      useAuthStore.getState().logout();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);
