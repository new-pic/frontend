import type { RtcEndRoomResponse } from "@entities/rtc-room";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RtcHostFinalizationState } from "./rtc-host-control";

interface UseRtcHostTerminationControllerOptions {
  preparePhotos: () => Promise<void>;
  stopPublishing: () => Promise<void>;
  endRoom: () => Promise<RtcEndRoomResponse>;
  deliverResult: (result: RtcEndRoomResponse) => Promise<void>;
  disconnectRoom: () => Promise<void>;
  onCompleted: (result: RtcEndRoomResponse) => void | Promise<void>;
  onStateChange?: (state: RtcHostFinalizationState) => void;
}

/**
 * Host 종료의 단일 lifecycle을 소유합니다.
 * 사진 확정 → 송출 중단 → 서버 종료 → 결과 전달 → 연결 정리 순서를
 * single-flight로 실행하며, 서버가 이미 종료된 재시도에서는 결과를 재사용합니다.
 */
export function useRtcHostTerminationController({
  preparePhotos,
  stopPublishing,
  endRoom,
  deliverResult,
  disconnectRoom,
  onCompleted,
  onStateChange,
}: UseRtcHostTerminationControllerOptions) {
  const isMountedRef = useRef(true);
  const terminationPromiseRef = useRef<Promise<void> | null>(null);
  const completedResultRef = useRef<RtcEndRoomResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const requestTermination = useCallback(() => {
    if (terminationPromiseRef.current) return terminationPromiseRef.current;

    const terminationPromise = (async () => {
      onStateChange?.("PREPARING_PHOTOS");
      setErrorMessage(null);

      let result = completedResultRef.current;
      let finalizationError: unknown;

      try {
        // 사진을 고르는 동안에는 기존 영상 송출을 유지합니다.
        await preparePhotos();

        onStateChange?.("ENDING_ROOM");
        await stopPublishing();

        if (!result) {
          result = await endRoom();
          completedResultRef.current = result;
        }

        if (!isMountedRef.current) return;

        onStateChange?.("DELIVERING_RESULT");
        await deliverResult(result);
      } catch (error) {
        finalizationError = error;
      } finally {
        try {
          await stopPublishing();
        } catch (error) {
          finalizationError ??= error;
        }
        try {
          await disconnectRoom();
        } catch (error) {
          finalizationError ??= error;
        }
      }

      if (finalizationError || !result) {
        if (isMountedRef.current) {
          setErrorMessage(
            finalizationError instanceof Error
              ? finalizationError.message
              : "RTC 공유 종료에 실패했습니다. 종료 처리를 다시 시도해주세요.",
          );
          onStateChange?.("FAILED");
        }
        return;
      }

      await onCompleted(result);
      if (isMountedRef.current) onStateChange?.("IDLE");
    })().finally(() => {
      terminationPromiseRef.current = null;
    });

    terminationPromiseRef.current = terminationPromise;
    return terminationPromise;
  }, [
    deliverResult,
    disconnectRoom,
    endRoom,
    onCompleted,
    onStateChange,
    preparePhotos,
    stopPublishing,
  ]);

  const clearError = useCallback(() => setErrorMessage(null), []);

  return { clearError, errorMessage, requestTermination };
}
