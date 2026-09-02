import type { RtcViewerSession } from "@entities/rtc-session";
import { getApiErrorMessage } from "@shared/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { rtcViewerQuery } from "../api";

type DisconnectLiveKit = () => Promise<void>;

export type RtcViewerExitResult =
  { ok: true } | { ok: false; errorMessage: string };

interface UseRtcViewerExitControllerOptions {
  session: RtcViewerSession | null;
  onExited: () => void;
}

/**
 * Viewer의 명시적인 나가기 순서를 한 경로로 직렬화합니다.
 * 서버 leave가 성공하기 전에는 LiveKit과 runtime session을 유지합니다.
 */
export function useRtcViewerExitController({
  session,
  onExited,
}: UseRtcViewerExitControllerOptions) {
  const { mutateAsync: leaveRoom } = rtcViewerQuery.useLeaveRtcRoom();
  const [isExiting, setIsExiting] = useState(false);
  const isMountedRef = useRef(true);
  const exitPromiseRef = useRef<Promise<RtcViewerExitResult> | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const requestExit = useCallback(
    (disconnectLiveKit?: DisconnectLiveKit) => {
      if (exitPromiseRef.current) return exitPromiseRef.current;

      const participantId = session?.participantId.trim();
      if (!participantId) {
        return Promise.resolve<RtcViewerExitResult>({
          ok: false,
          errorMessage: "RTC 참여 정보가 없습니다.",
        });
      }

      if (isMountedRef.current) setIsExiting(true);

      const exitPromise = (async (): Promise<RtcViewerExitResult> => {
        try {
          await leaveRoom({ participantId });
        } catch (error) {
          return {
            ok: false,
            errorMessage: getApiErrorMessage(
              error,
              "방에서 나가지 못했습니다. 잠시 후 다시 시도해주세요.",
            ),
          };
        }

        // 서버가 Viewer를 퇴장시킨 뒤에는 로컬 disconnect 실패가
        // session 종료를 되돌릴 수 없으므로 cleanup을 끝까지 진행합니다.
        try {
          await disconnectLiveKit?.();
        } catch {
          // LiveKitRoom unmount cleanup이 마지막 disconnect를 보장합니다.
        }

        onExited();
        return { ok: true };
      })().finally(() => {
        exitPromiseRef.current = null;
        if (isMountedRef.current) setIsExiting(false);
      });

      exitPromiseRef.current = exitPromise;
      return exitPromise;
    },
    [leaveRoom, onExited, session?.participantId],
  );

  return { isExiting, requestExit };
}
