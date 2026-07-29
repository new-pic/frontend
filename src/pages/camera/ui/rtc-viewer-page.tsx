import {
  RTC_MAX_SELECTED_PHOTOS,
  RtcEndRoomResponse,
  useRtcStore,
} from "@entities/rtc";
import {
  rtcStoredPhotoQuery,
  RTC_STORED_PHOTO_MAX_TAKE,
} from "@entities/rtc-stored-photo";
import { RtcViewerReactionPicker } from "@features/rtc/reactions";
import { RTC_NAVIGATION } from "@shared/config";
import {
  Button,
  ButtonText,
  Center,
  Text,
  VStack,
} from "@shared/ui";
import { Href, router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { RtcViewerLiveKitPage } from "./rtc-livekit-page";
import { SharingResultPage } from "./sharing-result-page";
import { SharingWaitingPage } from "./sharing-waiting-page";

interface RtcViewerResultPageProps {
  roomId: string;
  onDone: () => void;
}

function RtcViewerResultPage({
  roomId,
  onDone,
}: RtcViewerResultPageProps) {
  const photosQuery =
    rtcStoredPhotoQuery.useReadRoomRtcStoredPhotos({
      roomId,
      take: RTC_STORED_PHOTO_MAX_TAKE,
    });
  const images = useMemo(() => {
    const uniqueImages = new Map<
      string,
      { id: string; imageUrl: string }
    >();

    for (const page of photosQuery.data?.pages ?? []) {
      for (const photo of page.items) {
        uniqueImages.set(photo.id, {
          id: photo.id,
          imageUrl: photo.imageUrl,
        });
      }
    }

    return [...uniqueImages.values()];
  }, [photosQuery.data]);

  if (photosQuery.isError) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "white" }}
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
              onPress={() => void photosQuery.refetch()}
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
      isPending={photosQuery.isPending}
      isFetchingNextPage={photosQuery.isFetchingNextPage}
      onEndReached={() => {
        if (
          photosQuery.hasNextPage &&
          !photosQuery.isFetchingNextPage
        ) {
          void photosQuery.fetchNextPage();
        }
      }}
      onDone={onDone}
    />
  );
}

export function RtcViewerPage() {
  const viewerSession = useRtcStore(
    (state) => state.viewerSession,
  );
  const liveKitConnection = useRtcStore(
    (state) => state.liveKitConnection,
  );
  const clearViewerSession = useRtcStore(
    (state) => state.clearViewerSession,
  );
  const [resultRoomId, setResultRoomId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!viewerSession && resultRoomId === null) {
      router.replace(RTC_NAVIGATION.paths.join as Href);
    }
  }, [resultRoomId, viewerSession]);

  const leaveViewer = () => {
    clearViewerSession();
    router.replace("/feed" as Href);
  };

  const handleRoomEnded = (result: RtcEndRoomResponse) => {
    setResultRoomId(result.roomId);
    clearViewerSession();
  };

  if (resultRoomId !== null) {
    return (
      <RtcViewerResultPage
        roomId={resultRoomId}
        onDone={leaveViewer}
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
        isConnecting
        onCancel={leaveViewer}
      />
    );
  }

  return (
    <>
      <RtcViewerLiveKitPage
        connection={liveKitConnection}
        roomId={viewerSession.roomId}
        onCancel={leaveViewer}
        onRoomEnded={handleRoomEnded}
      />
      <RtcViewerReactionPicker
        active
        roomId={viewerSession.roomId}
      />
    </>
  );
}
