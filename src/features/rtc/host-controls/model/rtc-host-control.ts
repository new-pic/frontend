export type RtcCameraMenuMode = "IDLE" | "BUSY" | "LIVE";

export type RtcHostFinalizationState =
  | "IDLE"
  | "PREPARING_PHOTOS"
  | "ENDING_ROOM"
  | "DELIVERING_RESULT"
  | "FAILED";

export type RtcFinalizationBlockingState = Extract<
  RtcHostFinalizationState,
  "ENDING_ROOM" | "DELIVERING_RESULT"
>;

export function resolveRtcCameraMenuMode({
  isBusy,
  isLive,
}: {
  isBusy: boolean;
  isLive: boolean;
}): RtcCameraMenuMode {
  if (isBusy) return "BUSY";
  if (isLive) return "LIVE";
  return "IDLE";
}

export function isRtcFinalizationPending(
  state: RtcHostFinalizationState,
): boolean {
  return (
    state === "PREPARING_PHOTOS" ||
    state === "ENDING_ROOM" ||
    state === "DELIVERING_RESULT"
  );
}

export function isRtcFinalizationBlocking(
  state: RtcHostFinalizationState,
): state is RtcFinalizationBlockingState {
  return state === "ENDING_ROOM" || state === "DELIVERING_RESULT";
}

export function getRtcRoomReconnectDelay(
  retryAttempt: number,
): number {
  const safeAttempt = Math.max(0, Math.floor(retryAttempt));
  return Math.min(1_000 * 2 ** safeAttempt, 15_000);
}
