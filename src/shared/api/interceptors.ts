import * as SecureStore from "expo-secure-store";
import { ApiPrivateInstance } from "./api-private-instance";

ApiPrivateInstance.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("accessToken");

  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

ApiPrivateInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync("accessToken");

      // TODO: 로그인 화면 이동
    }

    return Promise.reject(error);
  },
);
