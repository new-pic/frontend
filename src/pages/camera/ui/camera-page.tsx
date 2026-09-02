import { feedQuery } from "@entities/feed";
import {
  adaptFeedToGuideSelection,
  CAMERA_GUIDE_NAVIGATION,
  type CameraGuideNavigationSearchParams,
} from "@features/camera/guide-feed";
import { RtcJoinSheet } from "@features/rtc/join-room";
import { RTC_NAVIGATION, type RtcNavigationSearchParams } from "@shared/config";
import { getFirstSearchParam } from "@shared/lib";
import { Box } from "@shared/ui";
import {
  CameraCaptureWorkspace,
  type CameraCaptureWorkspaceHandle,
} from "@widgets/camera/capture-workspace";
import {
  RtcSessionResult,
  type RtcSessionResultImage,
} from "@widgets/rtc/session-workspace";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { usePreventRemove } from "expo-router/react-navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BackHandler } from "react-native";

type CameraPageSearchParams = RtcNavigationSearchParams &
  CameraGuideNavigationSearchParams;

interface CameraResultScene {
  images: RtcSessionResultImage[];
  exitAfterResult: boolean;
}

export function CameraPage() {
  const searchParams = useLocalSearchParams<CameraPageSearchParams>();
  const workspaceRef = useRef<CameraCaptureWorkspaceHandle>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isExitBlocked, setIsExitBlocked] = useState(false);
  const [isManualJoinSheetOpen, setIsManualJoinSheetOpen] = useState(false);
  const [resultScene, setResultScene] = useState<CameraResultScene | null>(
    null,
  );
  const initialGuideFeedId = getFirstSearchParam(
    searchParams[CAMERA_GUIDE_NAVIGATION.params.feedId],
  )?.trim();
  const returnJoinCode = getFirstSearchParam(
    searchParams[RTC_NAVIGATION.params.code],
  );
  const shouldRestoreJoinSheet =
    getFirstSearchParam(searchParams[RTC_NAVIGATION.params.joinSheet]) ===
    RTC_NAVIGATION.values.joinSheetOpen;
  const isJoinSheetOpen = isManualJoinSheetOpen || shouldRestoreJoinSheet;
  const joinInitialCode = isManualJoinSheetOpen ? undefined : returnJoinCode;
  const {
    data: initialGuideData,
    isError: isInitialGuideError,
    isPending: isInitialGuidePending,
    refetch: refetchInitialGuide,
  } = feedQuery.useReadFeed({ feedId: initialGuideFeedId });
  const initialGuideSelection = useMemo(
    () =>
      initialGuideData ? adaptFeedToGuideSelection(initialGuideData) : null,
    [initialGuideData],
  );

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, []),
  );

  const requestWorkspaceExit = useCallback(() => {
    workspaceRef.current?.requestExit();
  }, []);

  usePreventRemove(isExitBlocked, requestWorkspaceExit);

  useEffect(() => {
    if (!isExitBlocked) return;

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        requestWorkspaceExit();
        return true;
      },
    );

    return () => subscription.remove();
  }, [isExitBlocked, requestWorkspaceExit]);

  const handleOpenJoinSheet = useCallback(() => {
    setIsManualJoinSheetOpen(true);
    router.setParams({
      [RTC_NAVIGATION.params.joinSheet]: RTC_NAVIGATION.values.joinSheetOpen,
    });
  }, []);

  const handleCloseJoinSheet = useCallback(() => {
    setIsManualJoinSheetOpen(false);

    if (shouldRestoreJoinSheet) {
      router.replace(RTC_NAVIGATION.paths.camera);
    }
  }, [shouldRestoreJoinSheet]);

  const handleRetryInitialGuide = useCallback(() => {
    void refetchInitialGuide();
  }, [refetchInitialGuide]);

  const handleRequestRouteExit = useCallback(() => router.back(), []);

  const handleResultReady = useCallback(
    (images: RtcSessionResultImage[], exitAfterResult: boolean) => {
      setIsExitBlocked(false);
      setResultScene({ images, exitAfterResult });
    },
    [],
  );

  const handleCloseResult = useCallback(() => {
    if (!resultScene) return;

    if (resultScene.exitAfterResult) {
      router.back();
      return;
    }
    setResultScene(null);
  }, [resultScene]);

  return (
    <>
      <Box className={resultScene ? "hidden" : "flex-1"}>
        <CameraCaptureWorkspace
          ref={workspaceRef}
          isFocused={isFocused && !resultScene}
          initialGuideFeedId={initialGuideFeedId}
          initialGuideSelection={initialGuideSelection}
          isInitialGuidePending={isInitialGuidePending}
          isInitialGuideError={isInitialGuideError}
          onRetryInitialGuide={handleRetryInitialGuide}
          onOpenJoin={handleOpenJoinSheet}
          onExitBlockedChange={setIsExitBlocked}
          onRequestRouteExit={handleRequestRouteExit}
          onResultReady={handleResultReady}
        />
      </Box>

      {resultScene ? (
        <RtcSessionResult
          images={resultScene.images}
          onDone={handleCloseResult}
        />
      ) : null}

      <RtcJoinSheet
        open={isJoinSheetOpen}
        initialCode={joinInitialCode}
        onClose={handleCloseJoinSheet}
      />
    </>
  );
}
