import type { RtcFeedbackEmojiListResponse } from "@entities/rtc";
import { apiClient } from "@shared/api";
import { useQuery } from "@tanstack/react-query";
import { rtcReactionQueryKeys } from "../model/query-keys";

export function useReadFeedbackEmojis() {
  return useQuery({
    queryKey: rtcReactionQueryKeys.feedbackEmojis(),
    queryFn: async () => {
      const response =
        await apiClient.get<RtcFeedbackEmojiListResponse>("/rtc/emojis");
      return response.data;
    },
  });
}
