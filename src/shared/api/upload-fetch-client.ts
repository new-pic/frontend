// 전송 데이터에 파일 또는 이미지 첨부가 필요한 경우, expo-file-system과 함께 사용하는
// 파일전용 fetch 클라이언트

import { env } from "@shared/config";
import { getAccessToken } from "@shared/lib";
import { fetch } from "expo/fetch";

type UPLOAD_METHODS = "POST" | "PUT" | "PATCH";

async function coreUploadFetchClient(
  url: string,
  method: UPLOAD_METHODS,
  formData: FormData,
): Promise<{ data: any; status: number }> {
  if (!env.API_URL) throw new Error("API_URL is not configured");

  const accessToken = await getAccessToken();

  const res = await fetch(`${env.API_URL}${url}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  const responseData = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(responseData ?? `Feed upload failed (${res.status})`);
  }

  return {
    data: responseData,
    status: res.status,
  };
}

interface UploadFetchClientParams {
  url: string;
  formData: FormData;
}

export const uploadFetchClient = {
  post: async ({ url, formData }: UploadFetchClientParams) => {
    return coreUploadFetchClient(url, "POST", formData);
  },
  put: async ({ url, formData }: UploadFetchClientParams) => {
    return coreUploadFetchClient(url, "PUT", formData);
  },
  patch: async ({ url, formData }: UploadFetchClientParams) => {
    return coreUploadFetchClient(url, "PATCH", formData);
  },
};
