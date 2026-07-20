import { apiClient } from "./api-client";

export interface TokenRefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export const requestTokenRefresh = async (
  refreshToken: string,
): Promise<TokenRefreshResponse> => {
  const response = await apiClient.post("/auth/refresh", { refreshToken });
  return response.data;
};
