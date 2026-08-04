import {
  RTC_MAX_SELECTED_PHOTOS,
  RtcEndRoomResponse,
  rtcViewerQuery,
  useRtcStore,
} from "@entities/rtc";
import {
  RTC_STORED_PHOTO_MAX_TAKE,
  rtcStoredPhotoQuery,
} from "@entities/rtc-stored-photo";
import { useResetMyRtcStoredPhotos } from "@features/rtc/finalize-session";
import { useRtcViewerEntry } from "@features/rtc/join-room";
import { RtcViewerReactionPicker } from "@features/rtc/reactions";
import { getApiErrorMessage } from "@shared/api";
import { RTC_NAVIGATION } from "@shared/config";
import { Button, ButtonText, Center, Text, VStack } from "@shared/ui";
import { Href, router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RtcViewerLiveKitPage } from "./rtc-livekit-page";
import { SharingResultPage } from "./sharing-result-page";
import { SharingWaitingPage } from "./sharing-waiting-page";

interface ViewerResultImage {
  id: string;
  imageUrl: string;
}

interface ViewerResultState {
  roomId: string;
  initialImages: ViewerResultImage[];
}

interface RtcViewerResultPageProps {
  roomId: string;
  initialImages: ViewerResultImage[];
  onDone: () => void;
}

function RtcViewerResultPage({
  roomId,
  initialImages,
  onDone,
}: RtcViewerResultPageProps) {
  const photosQuery = rtcStoredPhotoQuery.useReadRoomRtcStoredPhotos({
    roomId,
    take: RTC_STORED_PHOTO_MAX_TAKE,
  });

  const images = useMemo(() => {
    const uniqueImages = new Map<string, ViewerResultImage>();

    // RPC 응답으로 전달받은 이미지를 먼저 표시한다.
    for (const image of initialImages) {
      uniqueImages.set(image.id, image);
    }

    // 방 사진 API 응답을 합친다.
    // 같은 ID가 있으면 API의 최신 URL을 사용한다.
    for (const page of photosQuery.data?.pages ?? []) {
      for (const photo of page.items) {
        uniqueImages.set(photo.id, {
          id: photo.id,
          imageUrl: photo.imageUrl,
        });
      }
    }

    return [...uniqueImages.values()];
  }, [initialImages, photosQuery.data]);

  // RPC로 받은 사진도 없고 API까지 실패한 경우에만
  // 전체 오류 화면을 표시한다.
  if (!photosQuery.isPending && images.length === 0) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: "white",
        }}
      >
        <Center className="flex-1 bg-white px-6">
          <VStack className="w-full gap-4">
            <Text size="lg" bold className="text-center">
              촬영 결과를 불러오지 못했습니다.
            </Text>

            <Text className="text-center text-label-muted">
              잠시 후 다시 시도해주세요.
            </Text>

            <Button
              variant="outline"
              onPress={() => {
                void photosQuery.refetch();
              }}
            >
              <ButtonText>다시 시도</ButtonText>
            </Button>

            <Button variant="ghost" onPress={onDone}>
              <ButtonText>나가기</ButtonText>
            </Button>
          </VStack>
        </Center>
      </SafeAreaView>
    );
  }

  return (
    <SharingResultPage
      images={images}
      maxSelection={RTC_MAX_SELECTED_PHOTOS}
      // RPC 이미지가 이미 있다면 API 조회 중이어도
      // Skeleton 대신 해당 이미지를 바로 표시한다.
      isPending={photosQuery.isPending && images.length === 0}
      isFetchingNextPage={photosQuery.isFetchingNextPage}
      onEndReached={() => {
        if (photosQuery.hasNextPage && !photosQuery.isFetchingNextPage) {
          void photosQuery.fetchNextPage();
        }
      }}
      onDone={onDone}
    />
  );
}

export function RtcViewerPage() {
  const { mutateAsync: leaveRoom, isPending: isLeavingRoom } =
    rtcViewerQuery.useLeaveRtcRoom();

  const resetMyRtcStoredPhotos = useResetMyRtcStoredPhotos();

  const viewerSession = useRtcStore((state) => state.viewerSession);
  const liveKitConnection = useRtcStore((state) => state.liveKitConnection);
  const clearViewerSession = useRtcStore((state) => state.clearViewerSession);

  const [viewerResult, setViewerResult] = useState<ViewerResultState | null>(
    null,
  );

  const hasPresentedEndedAlertRef = useRef(false);
  const hasPresentedResultRef = useRef(false);
  const hasEnteredLiveRef = useRef(false);
  const leaveLockRef = useRef(false);

  const endedFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const hasViewerConnection = liveKitConnection?.role === "VIEWER";

  // LiveKit 연결 이후에도 SSE 구독을 유지한다.
  const viewerEntry = useRtcViewerEntry({
    enabled: Boolean(viewerSession),
    session: viewerSession,
  });
  const viewerEntry = useRtcViewerEntry({
    enabled: Boolean(viewerSession),
    session: viewerSession,
  });

  useEffect(() => {
    if (hasViewerConnection) {
      hasEnteredLiveRef.current = true;
    }
  }, [hasViewerConnection]);

  const clearEndedFallbackTimer = useCallback(() => {
    if (!endedFallbackTimerRef.current) {
      return;
    }

    clearTimeout(endedFallbackTimerRef.current);
    endedFallbackTimerRef.current = null;
  }, []);

  const finishViewerExit = useCallback(() => {
    clearEndedFallbackTimer();
    clearViewerSession();
    router.replace("/feed" as Href);
  }, [clearEndedFallbackTimer, clearViewerSession]);

  /*
   * RPC와 SSE가 모두 이 함수를 통해 결과 화면으로 진입한다.
   *
   * hasPresentedResultRef로 중복 호출을 막으므로
   * RPC와 SSE가 동시에 도착해도 한 번만 처리된다.
   */
  const presentViewerResult = useCallback(
    (
      roomId: string,
      savedImages: RtcEndRoomResponse["savedImages"] | undefined = [],
    ) => {
      const normalizedRoomId = roomId.trim();

      if (!normalizedRoomId || hasPresentedResultRef.current) {
        return;
      }

      hasPresentedResultRef.current = true;
      clearEndedFallbackTimer();

      setViewerResult({
        roomId: normalizedRoomId,
        initialImages: savedImages.map(({ id, url }) => ({
          id,
          imageUrl: url,
        })),
      });

      /*
       * Viewer Session과 Viewer LiveKit 연결을 정리한다.
       * viewerResult는 별도 React State이므로
       * Session을 제거해도 결과 화면은 유지된다.
       */
      clearViewerSession();

      /*
       * Profile의 내 RTC 촬영 사진 Query를 초기화한다.
       * 결과 화면 종료 후 Profile에 진입하면
       * 최신 촬영 사진을 다시 요청한다.
       */
      void resetMyRtcStoredPhotos().catch(() => undefined);
    },
    [clearEndedFallbackTimer, clearViewerSession, resetMyRtcStoredPhotos],
  );

  const handleCancelBeforeLiveKit = useCallback(async () => {
    const participantId = viewerSession?.participantId;

    if (!participantId || isLeavingRoom || leaveLockRef.current) {
      return;
    }

    leaveLockRef.current = true;

    try {
      await leaveRoom({
        participantId,
      });

      finishViewerExit();
    } catch (error) {
      Alert.alert(
        "RTC 방 나가기 실패",
        getApiErrorMessage(
          error,
          "방에서 나가지 못했습니다. 잠시 후 다시 시도해주세요.",
        ),
      );
    } finally {
      leaveLockRef.current = false;
    }
  }, [
    finishViewerExit,
    isLeavingRoom,
    leaveRoom,
    viewerSession?.participantId,
  ]);

  /*
   * 유효한 Viewer Session 없이 직접 Viewer 페이지에
   * 진입한 경우 참여 코드 화면으로 돌려보낸다.
   *
   * 결과 화면 전환 중에는 Viewer Session을 제거하므로
   * hasPresentedResultRef를 함께 검사해야 한다.
   */
  useEffect(() => {
    if (
      !viewerSession &&
      viewerResult === null &&
      !hasPresentedResultRef.current &&
      !hasPresentedEndedAlertRef.current
    ) {
      router.replace(RTC_NAVIGATION.paths.join as Href);
    }
  }, [viewerResult, viewerSession]);

  /*
   * SSE ended 처리
   *
   * 1. LiveKit 진입 전 종료:
   *    결과 사진이 없는 종료이므로 안내 후 Feed로 이동
   *
   * 2. LiveKit 진입 후 종료:
   *    RPC가 먼저 도착할 수 있으므로 1초 대기
   *    RPC가 오지 않으면 roomId만으로 결과 화면 진입
   *    결과 화면에서 방 사진 API를 요청
   */
  useEffect(() => {
    if (
      viewerEntry.phase !== "ROOM_ENDED" ||
      hasPresentedResultRef.current ||
      hasPresentedEndedAlertRef.current
    ) {
      return;
    }

    const roomId = viewerSession?.roomId.trim() ?? "";

    if (!roomId) {
      return;
    }

    // 실시간 공유 시작 전 방이 종료된 경우
    if (!hasEnteredLiveRef.current) {
      hasPresentedEndedAlertRef.current = true;
      clearViewerSession();

      Alert.alert(
        "실시간 공유 종료",
        "호스트가 공유를 시작하기 전에 방을 종료했습니다.",
        [
          {
            text: "확인",
            onPress: () => {
              router.replace("/feed" as Href);
            },
          },
        ],
        {
          cancelable: false,
        },
      );

      return;
    }

    // 이미 기다리는 Timer가 있으면 중복 생성하지 않는다.
    if (endedFallbackTimerRef.current) {
      return;
    }

    endedFallbackTimerRef.current = setTimeout(() => {
      endedFallbackTimerRef.current = null;

      /*
       * 1초 동안 RPC를 받지 못한 경우에도
       * 결과 화면으로 이동한다.
       *
       * initialImages는 비어 있지만 결과 페이지에서
       * GET /rtc/rooms/{roomId}/photos를 실행한다.
       */
      presentViewerResult(roomId);
    }, 1_000);

    return clearEndedFallbackTimer;
  }, [
    clearEndedFallbackTimer,
    clearViewerSession,
    presentViewerResult,
    viewerEntry.phase,
    viewerSession?.roomId,
  ]);

  /*
   * LiveKit 종료 결과 RPC 수신
   *
   * RPC에는 roomId와 savedImages가 포함되어 있으므로
   * API 응답을 기다리지 않고 바로 결과 화면을 표시한다.
   */
  const handleRoomEnded = useCallback(
    (result: RtcEndRoomResponse) => {
      presentViewerResult(result.roomId, result.savedImages);
    },
    [presentViewerResult],
  );

  if (viewerResult !== null) {
    return (
      <RtcViewerResultPage
        roomId={viewerResult.roomId}
        initialImages={viewerResult.initialImages}
        onDone={finishViewerExit}
      />
    );
  }

  if (
    !viewerSession ||
    !liveKitConnection ||
    liveKitConnection.role !== "VIEWER"
  ) {
    return (
      <SharingWaitingPage
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
        isCanceling={isLeavingRoom}
        onCancel={() => {
          void handleCancelBeforeLiveKit();
        }}
      />
    );
  }

  return (
    <RtcViewerLiveKitPage
      connection={liveKitConnection}
      roomId={viewerSession.roomId}
      rtcRoom={viewerEntry.room}
      reactionPicker={
        <RtcViewerReactionPicker
          active
          roomId={viewerSession.roomId}
          participantId={viewerSession.participantId}
        />
      }
      onCancel={finishViewerExit}
      onRoomEnded={handleRoomEnded}
    />
  );
}
