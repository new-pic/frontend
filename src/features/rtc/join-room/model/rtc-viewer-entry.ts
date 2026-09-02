import type { RtcRoomEvent } from "@entities/rtc-room";

export type RtcViewerRoomSignal = "LIVE" | "ENDED" | null;

interface RtcViewerEntryCallbackIdentity {
  currentEpoch: number;
  callbackEpoch: number;
  isMounted: boolean;
}

interface RtcViewerLiveKitMountState {
  hasSession: boolean;
  hasConnection: boolean;
  isCancelingBeforeLiveKit: boolean;
}

export function isRtcViewerEntryCallbackCurrent({
  currentEpoch,
  callbackEpoch,
  isMounted,
}: RtcViewerEntryCallbackIdentity): boolean {
  return isMounted && currentEpoch === callbackEpoch;
}

export function shouldMountRtcViewerLiveKit({
  hasSession,
  hasConnection,
  isCancelingBeforeLiveKit,
}: RtcViewerLiveKitMountState): boolean {
  return hasSession && hasConnection && !isCancelingBeforeLiveKit;
}

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
