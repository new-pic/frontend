import { useAuthStore } from "@shared/model";
import { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import * as SecureStore from "expo-secure-store";
import { requestTokenRefresh, TokenRefreshResponse } from "./tokens";

interface InterceptorProps {
  instance: AxiosInstance;
}

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let refreshPromise: Promise<TokenRefreshResponse> | null = null;

export const setupInterceptors = ({ instance }: InterceptorProps) => {
  instance.interceptors.request.use(async (config) => {
    const token = useAuthStore.getState().accessToken;

    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as
        | RetryableRequestConfig
        | undefined;
      const logout = useAuthStore.getState().logout;
      const setSession = useAuthStore.getState().setSession;

      if (error.response?.status !== 401 || !originalRequest) {
        return Promise.reject(error);
      }

      if (originalRequest._retry) {
        await logout();
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        // 진행 중인 refresh 요청이 없으면
        if (!refreshPromise) {
          refreshPromise = (async () => {
            const refreshToken = await SecureStore.getItemAsync("refreshToken");
            if (!refreshToken) {
              throw new Error("No refresh token available");
            }

            const newToken = await requestTokenRefresh(refreshToken);
            await setSession({
              accessToken: newToken.accessToken,
              refreshToken,
            });

            return newToken;
          })().finally(() => {
            refreshPromise = null;
          });
        }

        const newToken = await refreshPromise;
        originalRequest.headers.Authorization = `Bearer ${newToken.accessToken}`;
        return instance.request(originalRequest);
      } catch (refreshError) {
        await logout();
        return Promise.reject(refreshError);
      }
    },
  );
};
