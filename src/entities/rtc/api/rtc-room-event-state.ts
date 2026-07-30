import type {
  RtcRoomEvent,
  RtcRoomResponse,
} from "../model/models";

export function mergeRtcRoomEvent(
  room: RtcRoomResponse | undefined,
  event: RtcRoomEvent,
): RtcRoomResponse | undefined {
  if (
    !room ||
    event.type === "heartbeat" ||
    event.payload.roomId !== room.roomId
  ) {
    return room;
  }

  return {
    ...room,
    status: event.payload.status ?? room.status,
    expiresAt: event.payload.expiresAt ?? room.expiresAt,
    host: event.payload.host ?? room.host,
    participants:
      event.payload.participants ?? room.participants,
  };
}
