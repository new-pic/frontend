import type { RtcRoomEvent } from "@entities/rtc-room";

export type RtcViewerRoomSignal = "LIVE" | "ENDED" | null;

export function resolveRtcViewerRoomSignal(
  event: RtcRoomEvent,
): RtcViewerRoomSignal {
  if (event.type === "heartbeat") return null;
  if (event.type === "ended") return "ENDED";

  const status = event.payload.status?.trim().toUpperCase();
  if (status === "LIVE") return "LIVE";
  if (status === "ENDED") return "ENDED";

  return null;
}
