// 전송 데이터에 파일 또는 이미지 첨부가 필요한 경우, expo-file-system과 함께 사용하는
// 파일전용 fetch 클라이언트

import { env } from "@shared/config";
import { fetch } from "expo/fetch";
import { createApiRequestError } from "./api-error";
import { executeAuthenticatedFetch } from "./authenticated-fetch";

type UPLOAD_METHODS = "POST" | "PUT" | "PATCH";

const coreUploadFetchClient = async (
  url: string,
  method: UPLOAD_METHODS,
  formData: FormData,
  headers?: Record<string, string>,
): Promise<{ data: any; status: number }> => {
  if (!env.API_URL) throw new Error("API_URL is not configured");

  const request = (accessToken: string) =>
    fetch(`${env.API_URL}${url}`, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...headers,
      },
      body: formData,
    });

  const res = await executeAuthenticatedFetch({ request });

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
