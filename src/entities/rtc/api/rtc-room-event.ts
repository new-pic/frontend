import type { SseMessage } from "../../../shared/api/sse-parser";
import type { RtcRoomEvent, RtcRoomEventType } from "../model/models";
import {
  RtcRoomEventPayloadSchema,
  RtcRoomResponseSchema,
} from "../model/rtc-room-schema";

const RTC_ROOM_EVENT_TYPES = new Set<RtcRoomEventType>([
  "snapshot",
  "participants",
  "status",
  "ended",
]);

const isEndedStatus = (status?: string) =>
  status?.trim().toUpperCase() === "ENDED";

function parseUnnamedRtcRoomEvent(data: unknown): RtcRoomEvent | null {
  // event: 필드 없이 방 전체 정보가 전달되는 경우
  const parsedRoom = RtcRoomResponseSchema.safeParse(data);

  if (parsedRoom.success) {
    return {
      type: isEndedStatus(parsedRoom.data.status) ? "ended" : "snapshot",
      payload: parsedRoom.data,
    };
  }

  // event: 필드 없이 부분 갱신 정보가 전달되는 경우
  const parsedPayload = RtcRoomEventPayloadSchema.safeParse(data);

  if (!parsedPayload.success) {
    return null;
  }

  const payload = parsedPayload.data;

  if (isEndedStatus(payload.status)) {
    return {
      type: "ended",
      payload,
    };
  }

  if (payload.participants) {
    return {
      type: "participants",
      payload,
    };
  }

  if (payload.status) {
    return {
      type: "status",
      payload,
    };
  }

  return null;
}

export function parseRtcRoomEvent(message: SseMessage): RtcRoomEvent | null {
  if (message.event === "heartbeat") {
    return { type: "heartbeat" };
  }

  let data: unknown;

  try {
    data = JSON.parse(message.data);
  } catch {
    return null;
  }

  // 서버가 event: 필드를 생략하면 공용 Parser가 message로 설정함
  if (message.event === "message") {
    return parseUnnamedRtcRoomEvent(data);
  }

  if (!RTC_ROOM_EVENT_TYPES.has(message.event as RtcRoomEventType)) {
    return null;
  }

  const parsedPayload = RtcRoomEventPayloadSchema.safeParse(data);

  if (!parsedPayload.success) {
    return null;
  }

  return {
    type: message.event as RtcRoomEventType,
    payload: parsedPayload.data,
  };
}
