import type {
  ContentReportResponse,
  ContentReportTarget,
  CreateContentReportRequest,
} from "@entities/feed";
import { privateApiClient } from "@shared/api";
import { translate } from "@shared/lib/i18n";
import { useAuthStore } from "@shared/model";
import { useMutation } from "@tanstack/react-query";
import { getContentReportPath } from "./content-report-adapter";

export function useCreateContentReport() {
  return useMutation({
    mutationFn: async ({
      target,
      request,
    }: {
      target: ContentReportTarget;
      request: CreateContentReportRequest;
    }): Promise<ContentReportResponse> => {
      if (useAuthStore.getState().isGuest) {
        throw new Error(translate("feed.report.memberRequired"));
      }
      const response = await privateApiClient.post<ContentReportResponse>(
        getContentReportPath(target),
        request,
      );
      return response.data;
    },
  });
}
