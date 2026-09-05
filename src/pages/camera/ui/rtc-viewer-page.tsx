import { useRtcViewerSessionController } from "@features/rtc/join-room";
import { RTC_NAVIGATION } from "@shared/config";
import { RtcViewerWorkspace } from "@widgets/rtc/session-workspace";
import { Href, router } from "expo-router";
import { usePreventRemove } from "expo-router/react-navigation";
import { useEffect } from "react";
import { Alert, BackHandler } from "react-native";

export function RtcViewerPage() {
  const viewerController = useRtcViewerSessionController();
  const {
    viewerSession,
    viewerEntry,
    viewerResult,
    exitRequestId,
    isExitCompleted,
    isCancelingBeforeLiveKit,
    isResultPending,
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
  } = viewerController;

  usePreventRemove(shouldPreventExit, requestPageExit);

  useEffect(() => {
    if (!shouldPreventExit) return;

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        requestPageExit();
        return true;
      },
    );

    return () => subscription.remove();
  }, [requestPageExit, shouldPreventExit]);

  useEffect(() => {
    if (isExitCompleted) {
      router.replace("/feed" as Href);
    }
  }, [isExitCompleted]);

  useEffect(() => {
    if (shouldRedirectToJoin) {
      router.replace(RTC_NAVIGATION.paths.join as Href);
    }
  }, [shouldRedirectToJoin]);

  useEffect(() => {
    if (!hasEndedBeforeLive) return;

    Alert.alert(
      "실시간 공유 종료",
      "호스트가 공유를 시작하기 전에 방을 종료했습니다.",
      [{ text: "확인", onPress: finishSession }],
      { cancelable: false },
    );
  }, [finishSession, hasEndedBeforeLive]);

  return (
    <RtcViewerWorkspace
      viewerSession={viewerSession}
      viewerEntry={viewerEntry}
      viewerResult={viewerResult}
      exitRequestId={exitRequestId}
      isCancelingBeforeLiveKit={isCancelingBeforeLiveKit}
      isResultPending={isResultPending}
      isExiting={isExiting}
      exitErrorMessage={exitErrorMessage}
      onClearExitError={clearExitError}
      onCancelBeforeLiveKit={requestPageExit}
      onRequestExit={requestExit}
      onRoomEnded={handleRoomEnded}
      onResultDone={finishSession}
    />
  );
}
