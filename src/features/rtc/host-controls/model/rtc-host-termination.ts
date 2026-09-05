import type { RtcEndRoomResponse } from "@entities/rtc-room";
import type { RtcHostFinalizationState } from "./rtc-host-control";

export type RtcHostNonFatalTerminationStage =
  "RESULT_DELIVERY" | "PUBLISHER_CLEANUP" | "ROOM_DISCONNECT";

export type RtcHostCompletionResult =
  | { status: "COMPLETED" }
  | { status: "SKIPPED" }
  | { status: "FAILED"; error: unknown };

interface CompleteRtcHostTerminationOptions {
  result: RtcEndRoomResponse;
  isMounted: () => boolean;
  onCompleted: (result: RtcEndRoomResponse) => void | Promise<void>;
}

interface ExecuteRtcHostTerminationOptions {
  existingResult: RtcEndRoomResponse | null;
  preparePhotos: () => Promise<void>;
  stopPublishing: () => Promise<void>;
  endRoom: () => Promise<RtcEndRoomResponse>;
  deliverResult: (result: RtcEndRoomResponse) => Promise<void>;
  disconnectRoom: () => Promise<void>;
  isMounted: () => boolean;
  onCompleted: (result: RtcEndRoomResponse) => void | Promise<void>;
  onRoomEnded: (result: RtcEndRoomResponse) => void;
  onStateChange?: (state: RtcHostFinalizationState) => void;
  onNonFatalError?: (
    stage: RtcHostNonFatalTerminationStage,
    error: unknown,
  ) => void;
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

/**
 * 사진 준비부터 서버 종료, 결과 전달과 로컬 cleanup까지 순서대로 실행합니다.
 * 서버 종료 이후 단계는 best-effort이며 server result를 무효화하지 않습니다.
 */
export async function executeRtcHostTermination({
  existingResult,
  preparePhotos,
  stopPublishing,
  endRoom,
  deliverResult,
  disconnectRoom,
  isMounted,
  onCompleted,
  onRoomEnded,
  onStateChange,
  onNonFatalError,
}: ExecuteRtcHostTerminationOptions): Promise<RtcHostCompletionResult> {
  onStateChange?.("PREPARING_PHOTOS");

  let result = existingResult;
  let finalizationError: unknown;

  try {
    await preparePhotos();

    onStateChange?.("ENDING_ROOM");
    await stopPublishing();

    if (!result) {
      result = await endRoom();
      onRoomEnded(result);
    }

    if (isMounted()) {
      onStateChange?.("DELIVERING_RESULT");
      try {
        await deliverResult(result);
      } catch (error) {
        onNonFatalError?.("RESULT_DELIVERY", error);
      }
    }
  } catch (error) {
    finalizationError = error;
  } finally {
    try {
      await stopPublishing();
    } catch (error) {
      if (result) {
        onNonFatalError?.("PUBLISHER_CLEANUP", error);
      } else {
        finalizationError ??= error;
      }
    }
    try {
      await disconnectRoom();
    } catch (error) {
      if (result) {
        onNonFatalError?.("ROOM_DISCONNECT", error);
      } else {
        finalizationError ??= error;
      }
    }
  }

  if (finalizationError || !result) {
    return {
      status: "FAILED",
      error:
        finalizationError ??
        new Error("RTC 공유 종료 결과를 확인하지 못했습니다."),
    };
  }

  return completeRtcHostTermination({ result, isMounted, onCompleted });
}
