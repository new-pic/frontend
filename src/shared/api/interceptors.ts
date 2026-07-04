import * as SecureStore from "expo-secure-store";
import { ApiInstance } from "./api-instance";

ApiInstance.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("accessToken");

  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

ApiInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync("accessToken");

      // TODO: 로그인 화면 이동
    }

    return Promise.reject(error);
  },
);
