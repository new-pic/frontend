import { useAuthStore } from "@shared/model";
import { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { refreshAuthSession } from "./refresh-auth-session";

interface InterceptorProps {
  instance: AxiosInstance;
}

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

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
        RetryableRequestConfig | undefined;
      const logout = useAuthStore.getState().logout;

      if (error.response?.status !== 401 || !originalRequest) {
        return Promise.reject(error);
      }

      if (originalRequest._retry) {
        await logout();
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        const newToken = await refreshAuthSession();
        originalRequest.headers.Authorization = `Bearer ${newToken.accessToken}`;
        return instance.request(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    },
  );
};
