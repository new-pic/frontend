import { privateApiClient } from "@shared/api";
import { useAuthStore } from "@shared/model";
import { useMutation } from "@tanstack/react-query";
import type {
  ContentReportResponse,
  ContentReportTarget,
  CreateContentReportRequest,
} from "../model";
import { getContentReportPath } from "./feed-report-adapter";

export function useCreateContentReport() {
  return useMutation({
    mutationFn: async ({
      target,
      request,
    }: {
      target: ContentReportTarget;
      request: CreateContentReportRequest;
    }): Promise<ContentReportResponse> => {
      const isGuest = useAuthStore.getState().isGuest;

      if (isGuest) {
        throw new Error("신고하려면 회원 로그인이 필요합니다.");
      }

      const response = await privateApiClient.post<ContentReportResponse>(
        getContentReportPath(target),
        request,
      );
      return response.data;
    },
  });
}
