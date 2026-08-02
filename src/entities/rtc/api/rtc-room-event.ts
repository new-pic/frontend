import type { SseMessage } from "../../../shared/api/sse-parser";
import { RtcRoomEventPayloadSchema } from "../model/rtc-room-schema";
import type {
  RtcRoomEvent,
  RtcRoomEventType,
} from "../model/models";

const RTC_ROOM_EVENT_TYPES = new Set<RtcRoomEventType>([
  "snapshot",
  "participants",
  "status",
  "ended",
]);

export function parseRtcRoomEvent(
  message: SseMessage,
): RtcRoomEvent | null {
  if (message.event === "heartbeat") {
    return { type: "heartbeat" };
  }
  if (
    !RTC_ROOM_EVENT_TYPES.has(
      message.event as RtcRoomEventType,
    )
  ) {
    return null;
  }

  try {
    const parsedPayload = RtcRoomEventPayloadSchema.safeParse(
      JSON.parse(message.data),
    );
    if (!parsedPayload.success) return null;

    return {
      type: message.event as RtcRoomEventType,
      payload: parsedPayload.data,
    };
  } catch {
    return null;
  }
}
