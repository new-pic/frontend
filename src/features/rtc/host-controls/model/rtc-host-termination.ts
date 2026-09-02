import type { RtcEndRoomResponse } from "@entities/rtc-room";

export type RtcHostCompletionResult =
  | { status: "COMPLETED" }
  | { status: "SKIPPED" }
  | { status: "FAILED"; error: unknown };

interface CompleteRtcHostTerminationOptions {
  result: RtcEndRoomResponse;
  isMounted: () => boolean;
  onCompleted: (result: RtcEndRoomResponse) => void | Promise<void>;
}

export async function completeRtcHostTermination({
  result,
  isMounted,
  onCompleted,
}: CompleteRtcHostTerminationOptions): Promise<RtcHostCompletionResult> {
  if (!isMounted()) return { status: "SKIPPED" };

  try {
    await onCompleted(result);
  } catch (error) {
    return { status: "FAILED", error };
  }

  return isMounted() ? { status: "COMPLETED" } : { status: "SKIPPED" };
}
