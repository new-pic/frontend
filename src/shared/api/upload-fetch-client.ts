// 전송 데이터에 파일 또는 이미지 첨부가 필요한 경우, expo-file-system과 함께 사용하는
// 파일전용 fetch 클라이언트

import { env } from "@shared/config";
import { fetch } from "expo/fetch";
import { useAuthStore } from "../model/auth-store";
import { createApiRequestError } from "./api-error";
import { refreshAuthSession } from "./refresh-auth-session";

type UPLOAD_METHODS = "POST" | "PUT" | "PATCH";

const coreUploadFetchClient = async (
  url: string,
  method: UPLOAD_METHODS,
  formData: FormData,
  headers?: Record<string, string>,
): Promise<{ data: any; status: number }> => {
  if (!env.API_URL) throw new Error("API_URL is not configured");

  const request = (accessToken: string | null) =>
    fetch(`${env.API_URL}${url}`, {
      method,
      headers: {
        ...(accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : undefined),
        ...headers,
      },
      body: formData,
    });

  let res = await request(useAuthStore.getState().accessToken);
  if (res.status === 401) {
    const newToken = await refreshAuthSession();
    res = await request(newToken.accessToken);
  }

  const responseData = await res.json().catch(() => null);

  if (!res.ok) {
    throw createApiRequestError({
      payload: responseData,
      status: res.status,
      fallback: `파일 업로드에 실패했습니다. (${res.status})`,
    });
  }

  return {
    data: responseData,
    status: res.status,
  };
};

interface UploadFetchClientParams {
  url: string;
  formData: FormData;
  headers?: Record<string, string>;
}

export const uploadFetchClient = {
  post: async ({ url, formData, headers }: UploadFetchClientParams) => {
    return coreUploadFetchClient(url, "POST", formData, headers);
  },
  put: async ({ url, formData, headers }: UploadFetchClientParams) => {
    return coreUploadFetchClient(url, "PUT", formData, headers);
  },
  patch: async ({ url, formData, headers }: UploadFetchClientParams) => {
    return coreUploadFetchClient(url, "PATCH", formData, headers);
  },
};
