import {
  RtcViewerLiveKit,
  RtcViewerWaiting,
  shouldMountRtcViewerLiveKit,
  type RtcViewerEntryResult,
  type RtcViewerResultState,
  type RtcViewerExitResult,
} from "@features/rtc/join-room";
import type { RtcEndRoomResponse } from "@entities/rtc-room";
import type { RtcViewerSession } from "@entities/rtc-session";
import { RtcViewerReactionPicker } from "@features/rtc/reactions";
import { useEffect } from "react";
import { Alert } from "react-native";
import { RtcViewerResult } from "./rtc-viewer-result";

interface RtcViewerWorkspaceProps {
  viewerSession: RtcViewerSession | null;
  viewerEntry: RtcViewerEntryResult;
  viewerResult: RtcViewerResultState | null;
  exitRequestId: number;
  isCancelingBeforeLiveKit: boolean;
  isResultPending: boolean;
  isExiting: boolean;
  exitErrorMessage: string | null;
  onClearExitError: () => void;
  onCancelBeforeLiveKit: () => void;
  onRequestExit: (
    disconnectLiveKit?: () => Promise<void>,
  ) => Promise<RtcViewerExitResult>;
  onRoomEnded: (result: RtcEndRoomResponse) => void;
  onResultDone: () => void;
}

export function RtcViewerWorkspace({
  viewerSession,
  viewerEntry,
  viewerResult,
  exitRequestId,
  isCancelingBeforeLiveKit,
  isResultPending,
  isExiting,
  exitErrorMessage,
  onClearExitError,
  onCancelBeforeLiveKit,
  onRequestExit,
  onRoomEnded,
  onResultDone,
}: RtcViewerWorkspaceProps) {
  useEffect(() => {
    if (!exitErrorMessage) return;

    Alert.alert("RTC 방 나가기 실패", exitErrorMessage, [
      { text: "확인", onPress: onClearExitError },
    ]);
  }, [exitErrorMessage, onClearExitError]);

  if (viewerResult) {
    return (
      <RtcViewerResult
        roomId={viewerResult.roomId}
        initialImages={viewerResult.initialImages}
        onDone={onResultDone}
      />
    );
  }

  if (isResultPending) {
    return <RtcViewerWaiting mode="PREPARING_RESULT" />;
  }

  const shouldMountLiveKit = shouldMountRtcViewerLiveKit({
    hasSession: Boolean(viewerSession),
    hasConnection: Boolean(viewerEntry.connection),
    isCancelingBeforeLiveKit,
  });

  if (!shouldMountLiveKit || !viewerSession || !viewerEntry.connection) {
    return (
      <RtcViewerWaiting
        hostNickname={viewerEntry.room?.host.nickname}
        isConnecting={
          viewerEntry.phase === "REQUESTING_TOKEN" ||
          viewerEntry.streamState === "CONNECTING" ||
          viewerEntry.streamState === "RECONNECTING"
        }
        connectionError={viewerEntry.tokenErrorMessage}
        onRetry={
          viewerEntry.phase === "TOKEN_ERROR"
            ? viewerEntry.retryToken
            : undefined
        }
        isCanceling={isExiting}
        onCancel={onCancelBeforeLiveKit}
      />
    );
  }

  return (
    <RtcViewerLiveKit
      connection={viewerEntry.connection}
      roomId={viewerSession.roomId}
      rtcRoom={viewerEntry.room}
      reactionPicker={
        <RtcViewerReactionPicker
          active
          roomId={viewerSession.roomId}
          participantId={viewerSession.participantId}
        />
      }
      isExiting={isExiting}
      exitRequestId={exitRequestId}
      onRequestExit={onRequestExit}
      onRoomEnded={onRoomEnded}
    />
  );
}
