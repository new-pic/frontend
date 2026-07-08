import * as SecureStore from "expo-secure-store";

const ACCESS_TOKEN_KEY = "accessToken";

/**
 * secure storage에 저장된 accessToken을 가져오는 함수
 * @returns accessToken
 */
export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

/**
 * secure storage에 accessToken을 저장하는 함수
 * @param token
 * @returns
 */
export async function setAccessToken(token: string): Promise<void> {
  return SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
}

/**
 * secure storage에 저장된 accessToken을 삭제하는 함수
 * @returns
 */
export async function deleteAccessToken(): Promise<void> {
  return SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
}
