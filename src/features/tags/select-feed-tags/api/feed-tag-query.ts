import type { FeedTagResponse } from "@entities/feed";
import { apiClient } from "@shared/api";
import { useQuery } from "@tanstack/react-query";
import { feedTagQueryKeys } from "../model/query-keys";

export function useReadTags({ keyword }: { keyword?: string }) {
  return useQuery({
    queryKey: feedTagQueryKeys.search(keyword),
    queryFn: async (): Promise<FeedTagResponse> => {
      const response = await apiClient.get("/feed/tags", {
        params: { keyword },
      });
      return response.data.items;
    },
  });
}
