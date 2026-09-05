import { createSseParser, executeAuthenticatedFetch } from "@shared/api";
import { env } from "@shared/config";
import { fetch } from "expo/fetch";
import { verifyRtcId } from "../lib";
import { type RtcRoomEvent } from "../model";
import { parseRtcRoomEvent } from "./rtc-room-event";

interface SubscribeRtcRoomEventsOptions {
  roomId: string;
  signal: AbortSignal;
  onOpen?: () => void;
  onEvent: (event: RtcRoomEvent) => void;
}

/**
 * RTC 방 상태·참여자 현황 실시간 구독
 * @description RTC 역할과 관계없이 앱 access token으로 방 상태를 구독합니다.
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
  const response = await executeAuthenticatedFetch({
    signal,
    request: (accessToken) =>
      fetch(`${env.API_URL}/rtc/rooms/${id}/events`, {
        method: "GET",
        headers: {
          Accept: "text/event-stream",
          Authorization: `Bearer ${accessToken}`,
        },
        signal,
      }),
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
