import { apiClient, createSseParser } from "@shared/api";
import { env } from "@shared/config";
import { useAuthStore } from "@shared/model";
import { useQuery } from "@tanstack/react-query";
import { fetch } from "expo/fetch";
import { verifyRtcId } from "../lib";
import {
  RtcFeedbackEmojiListResponse,
  rtcQueryKeys,
  type RtcRoomEvent,
} from "../model";
import { parseRtcRoomEvent } from "./rtc-room-event";

/**
 * RTC 피드백 이모지 목록 조회
 */
export const useReadFeedbackEmojis = () => {
  return useQuery({
    queryKey: rtcQueryKeys.feedbackEmojis(),
    queryFn: async () => {
      const response =
        await apiClient.get<RtcFeedbackEmojiListResponse>("/rtc/emojis");
      return response.data;
    },
  });
};

interface SubscribeRtcRoomEventsOptions {
  roomId: string;
  signal: AbortSignal;
  onOpen?: () => void;
  onEvent: (event: RtcRoomEvent) => void;
}

/**
 * RTC 역할과 관계없이 앱 access token으로 방 상태를 구독합니다.
 */
export async function subscribeRtcRoomEvents({
  roomId,
  signal,
  onOpen,
  onEvent,
}: SubscribeRtcRoomEventsOptions): Promise<void> {
  if (!env.API_URL) {
    throw new Error("API_URL is not configured");
  }

  const id = verifyRtcId(roomId, "RTC 방 ID");
  const accessToken = useAuthStore.getState().accessToken?.trim() ?? "";
  if (!accessToken) {
    throw new Error("로그인이 필요합니다.");
  }

  const response = await fetch(`${env.API_URL}/rtc/rooms/${id}/events`, {
    method: "GET",
    headers: {
      Accept: "text/event-stream",
      Authorization: `Bearer ${accessToken}`,
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`RTC room stream failed (${response.status})`);
  }
  if (!response.body) {
    throw new Error("RTC room stream body is unavailable");
  }

  onOpen?.();

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const parser = createSseParser((message) => {
    const event = parseRtcRoomEvent(message);
    if (event) onEvent(event);
  });

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      parser.push(decoder.decode(value, { stream: true }));
    }
    parser.push(decoder.decode());
    parser.finish();
  } finally {
    reader.releaseLock();
  }
}
