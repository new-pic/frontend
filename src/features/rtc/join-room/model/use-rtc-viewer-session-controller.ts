import type { RtcEndRoomResponse } from "@entities/rtc-room";
import {
  rtcStoredPhotoQuery,
  type RtcStoredPhoto,
} from "@entities/rtc-stored-photo";
import { useRtcStore } from "@entities/rtc-session";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRtcViewerEntry } from "./use-rtc-viewer-entry";
import { useRtcViewerExitController } from "./use-rtc-viewer-exit-controller";

export interface RtcViewerResultState {
  roomId: string;
  initialImages: Pick<RtcStoredPhoto, "id" | "imageUrl">[];
}

export function useRtcViewerSessionController() {
  const resetMyRtcStoredPhotos =
    rtcStoredPhotoQuery.useResetMyRtcStoredPhotos();
  const viewerSession = useRtcStore((state) => state.viewerSession);
  const clearViewerSession = useRtcStore((state) => state.clearViewerSession);
  const [viewerResult, setViewerResult] = useState<RtcViewerResultState | null>(
    null,
  );
  const [exitRequestId, setExitRequestId] = useState(0);
  const [isExitCompleted, setIsExitCompleted] = useState(false);
  const [isCancelingBeforeLiveKit, setIsCancelingBeforeLiveKit] =
    useState(false);
  const [exitErrorMessage, setExitErrorMessage] = useState<string | null>(null);
  const [hasEndedBeforeLive, setHasEndedBeforeLive] = useState(false);
  const hasPresentedResultRef = useRef(false);
  const hasEnteredLiveRef = useRef(false);
  const endedFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const viewerEntry = useRtcViewerEntry({
    enabled: Boolean(viewerSession),
    session: viewerSession,
  });

  useEffect(() => {
    if (viewerEntry.connection) hasEnteredLiveRef.current = true;
  }, [viewerEntry.connection]);

  const clearEndedFallbackTimer = useCallback(() => {
    if (!endedFallbackTimerRef.current) return;

    clearTimeout(endedFallbackTimerRef.current);
    endedFallbackTimerRef.current = null;
  }, []);

  const finishSession = useCallback(() => {
    clearEndedFallbackTimer();
    setIsExitCompleted(true);
    clearViewerSession();
  }, [clearEndedFallbackTimer, clearViewerSession]);

  const { isExiting, requestExit } = useRtcViewerExitController({
    session: viewerSession,
    onExited: finishSession,
  });

  const presentViewerResult = useCallback(
    (
      roomId: string,
      savedImages: RtcEndRoomResponse["savedImages"] | undefined = [],
    ) => {
      const normalizedRoomId = roomId.trim();
      if (!normalizedRoomId || hasPresentedResultRef.current) return;

      hasPresentedResultRef.current = true;
      clearEndedFallbackTimer();
      setViewerResult({
        roomId: normalizedRoomId,
        initialImages: savedImages.map(({ id, url }) => ({
          id,
          imageUrl: url,
        })),
      });
      clearViewerSession();
      void resetMyRtcStoredPhotos().catch(() => undefined);
    },
    [clearEndedFallbackTimer, clearViewerSession, resetMyRtcStoredPhotos],
  );

  useEffect(() => {
    if (
      viewerEntry.phase !== "ROOM_ENDED" ||
      hasPresentedResultRef.current ||
      hasEndedBeforeLive
    ) {
      return;
    }

    const roomId = viewerSession?.roomId.trim() ?? "";
    if (!roomId) return;

    if (!hasEnteredLiveRef.current) {
      setHasEndedBeforeLive(true);
      clearViewerSession();
      return;
    }

    if (endedFallbackTimerRef.current) return;

    endedFallbackTimerRef.current = setTimeout(() => {
      endedFallbackTimerRef.current = null;
      presentViewerResult(roomId);
    }, 1_000);

    return clearEndedFallbackTimer;
  }, [
    clearEndedFallbackTimer,
    clearViewerSession,
    hasEndedBeforeLive,
    presentViewerResult,
    viewerEntry.phase,
    viewerSession?.roomId,
  ]);

  const handleRoomEnded = useCallback(
    (result: RtcEndRoomResponse) => {
      presentViewerResult(result.roomId, result.savedImages);
    },
    [presentViewerResult],
  );

  const cancelBeforeLiveKit = useCallback(async () => {
    setIsCancelingBeforeLiveKit(true);
    setExitErrorMessage(null);
    const result = await requestExit();

    if (!result.ok) {
      setIsCancelingBeforeLiveKit(false);
      setExitErrorMessage(result.errorMessage);
    }
  }, [requestExit]);

  const requestPageExit = useCallback(() => {
    if (isExiting) return;

    if (viewerEntry.connection) {
      setExitRequestId((current) => current + 1);
      return;
    }

    void cancelBeforeLiveKit();
  }, [cancelBeforeLiveKit, isExiting, viewerEntry.connection]);

  const clearExitError = useCallback(() => setExitErrorMessage(null), []);

  const shouldPreventExit =
    Boolean(viewerSession) && viewerResult === null && !isExitCompleted;
  const shouldRedirectToJoin =
    !viewerSession &&
    viewerResult === null &&
    !isExitCompleted &&
    !hasPresentedResultRef.current &&
    !hasEndedBeforeLive;

  return {
    viewerSession,
    viewerEntry,
    viewerResult,
    exitRequestId,
    isExitCompleted,
    isCancelingBeforeLiveKit,
    isExiting,
    exitErrorMessage,
    hasEndedBeforeLive,
    shouldPreventExit,
    shouldRedirectToJoin,
    requestExit,
    requestPageExit,
    handleRoomEnded,
    finishSession,
    clearExitError,
  };
}
