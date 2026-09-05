import type { RtcEndRoomResponse } from "@entities/rtc-room";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RtcHostFinalizationState } from "./rtc-host-control";
import {
  executeRtcHostTermination,
  type RtcHostNonFatalTerminationStage,
} from "./rtc-host-termination";

interface UseRtcHostTerminationControllerOptions {
  preparePhotos: () => Promise<void>;
  stopPublishing: () => Promise<void>;
  endRoom: () => Promise<RtcEndRoomResponse>;
  deliverResult: (result: RtcEndRoomResponse) => Promise<void>;
  disconnectRoom: () => Promise<void>;
  onCompleted: (result: RtcEndRoomResponse) => void | Promise<void>;
  onStateChange?: (state: RtcHostFinalizationState) => void;
  onNonFatalError?: (
    stage: RtcHostNonFatalTerminationStage,
    error: unknown,
  ) => void;
}

/**
 * Host 종료의 단일 lifecycle을 소유합니다.
 * 사진 확정 → 송출 중단 → 서버 종료 → 결과 전달 → 연결 정리 순서를
 * single-flight로 실행합니다. 서버 종료가 성공한 뒤의 RPC 전달과 로컬 연결
 * 정리는 best-effort로 수행하며, 서버가 확정한 결과를 종료의 기준으로 삼습니다.
 */
export function useRtcHostTerminationController({
  preparePhotos,
  stopPublishing,
  endRoom,
  deliverResult,
  disconnectRoom,
  onCompleted,
  onStateChange,
  onNonFatalError,
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
      setErrorMessage(null);

      const completion = await executeRtcHostTermination({
        existingResult: completedResultRef.current,
        preparePhotos,
        stopPublishing,
        endRoom,
        deliverResult,
        disconnectRoom,
        isMounted: () => isMountedRef.current,
        onCompleted,
        onRoomEnded: (result) => {
          completedResultRef.current = result;
        },
        onStateChange,
        onNonFatalError,
      });

      if (completion.status === "FAILED") {
        if (isMountedRef.current) {
          setErrorMessage(
            completion.error instanceof Error
              ? completion.error.message
              : "RTC 공유 종료에 실패했습니다. 종료 처리를 다시 시도해주세요.",
          );
          onStateChange?.("FAILED");
        }
        return;
      }

      if (completion.status === "COMPLETED" && isMountedRef.current) {
        onStateChange?.("IDLE");
      }
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
    onNonFatalError,
    onStateChange,
    preparePhotos,
    stopPublishing,
  ]);

  const clearError = useCallback(() => setErrorMessage(null), []);

  return { clearError, errorMessage, requestTermination };
}
