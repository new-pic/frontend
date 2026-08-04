import type { RtcRoomEvent, RtcRoomResponse } from "../model/models";
import { RtcRoomResponseSchema } from "../model/rtc-room-schema";

export function mergeRtcRoomEvent(
  room: RtcRoomResponse | undefined,
  event: RtcRoomEvent,
): RtcRoomResponse | undefined {
  if (event.type === "heartbeat") {
    return room;
  }

  // Snapshot은 기존 Cache 유무와 관계없이 방 전체 상태를 교체한다.
  if (event.type === "snapshot") {
    const parsedRoom = RtcRoomResponseSchema.safeParse(event.payload);

    if (parsedRoom.success) {
      return parsedRoom.data;
    }
  }

  if (!room || event.payload.roomId !== room.roomId) {
    return room;
  }

  return {
    ...room,
    status: event.payload.status ?? room.status,
    expiresAt: event.payload.expiresAt ?? room.expiresAt,
    host: event.payload.host ?? room.host,
    participants: event.payload.participants ?? room.participants,
  };
}
