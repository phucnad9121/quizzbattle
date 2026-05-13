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

apiClient.interceptors.request.use(async (config) => {
  const typedConfig = config as RetryConfig;
  
  // Lấy trạng thái hiện tại
  let state = useAuthStore.getState();
  
  // Nếu đang trong quá trình khởi tạo (isLoading) mà chưa có token
  // chúng ta sẽ đợi một chút để tránh việc gửi request thiếu Header
  if (state.isLoading && !state.accessToken && !typedConfig._skipRefresh) {
    // Đợi tối đa 2 giây (check mỗi 100ms)
    for (let i = 0; i < 20; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      state = useAuthStore.getState();
      if (state.accessToken || !state.isLoading) break;
    }
  }

  const accessToken = state.accessToken;

  if (config.headers?.Authorization) {
    return config;
  }

  // Chèn token nếu hợp lệ
  if (accessToken && typeof accessToken === "string" && accessToken !== "undefined" && accessToken !== "null") {
    config.headers.Authorization = `Bearer ${accessToken}`;
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

    const { refreshToken, logout, setTokens } = useAuthStore.getState();
    
    if (!refreshToken) {
      logout("No refresh token available");
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
      // Sử dụng axios trực tiếp để tránh interceptor vòng lặp
      const response = await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        null,
        {
          headers: {
            Authorization: `Bearer ${refreshToken}`,
          },
        }
      );

      const { access_token, refresh_token } = response.data as {
        access_token: string;
        refresh_token: string;
      };

      setTokens({
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
      // KIỂM TRA QUAN TRỌNG: Nếu trong lúc ta đang refresh mà một request khác 
      // đã refresh thành công và cập nhật token mới vào Store rồi, 
      // thì ta KHÔNG được logout.
      const currentState = useAuthStore.getState();
      if (currentState.refreshToken && currentState.refreshToken !== refreshToken) {
        console.log("[Auth] Concurrent refresh detected, retrying with new token...");
        processQueue(null, currentState.accessToken);
        if (originalConfig) {
          originalConfig.headers.Authorization = `Bearer ${currentState.accessToken}`;
          return apiClient(originalConfig);
        }
      }

      processQueue(refreshError, null);
      
      // CHỈ logout nếu server thực sự từ chối token (401/403)
      if (axios.isAxiosError(refreshError) && (refreshError.response?.status === 401 || refreshError.response?.status === 403)) {
        logout("Refresh token expired or invalid");
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);
