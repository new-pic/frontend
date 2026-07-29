import { apiClient } from "@shared/api";
import { useQuery } from "@tanstack/react-query";
import {
  API_QUERY_KEY,
  RtcFeedbackEmojiListResponse,
} from "../model";

const QUERY_KEY = [API_QUERY_KEY, "global"] as const;

/**
 * RTC 피드백 이모지 목록 조회
 */
export const useReadFeedbackEmojis = () => {
  return useQuery({
    queryKey: [...QUERY_KEY, "emojis"],
    queryFn: async () => {
      const response =
        await apiClient.get<RtcFeedbackEmojiListResponse>("/rtc/emojis");
      return response.data;
    },
  });
};
