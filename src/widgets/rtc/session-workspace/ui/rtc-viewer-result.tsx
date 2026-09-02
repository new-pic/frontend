import { RTC_MAX_SELECTED_PHOTOS } from "@entities/rtc-room";
import { RTC_STORED_PHOTO_MAX_TAKE } from "@entities/rtc-stored-photo";
import { rtcViewerQuery } from "@features/rtc/join-room";
import { Button, ButtonText, Center, Text, VStack } from "@shared/ui";
import { useMemo } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  RtcSessionResult,
  type RtcSessionResultImage,
} from "./rtc-session-result";

interface RtcViewerResultProps {
  roomId: string;
  initialImages: RtcSessionResultImage[];
  onDone: () => void;
}

export function RtcViewerResult({
  roomId,
  initialImages,
  onDone,
}: RtcViewerResultProps) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetchingNextPage,
    isPending,
    refetch,
  } = rtcViewerQuery.useReadRoomRtcStoredPhotos({
    roomId,
    take: RTC_STORED_PHOTO_MAX_TAKE,
  });

  const images = useMemo(() => {
    const uniqueImages = new Map<string, RtcSessionResultImage>();

    for (const image of initialImages) uniqueImages.set(image.id, image);
    for (const page of data?.pages ?? []) {
      for (const photo of page.items) {
        uniqueImages.set(photo.id, {
          id: photo.id,
          imageUrl: photo.imageUrl,
        });
      }
    }

    return [...uniqueImages.values()];
  }, [data, initialImages]);

  if (!isPending && images.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <Center className="flex-1 bg-white px-6">
          <VStack className="w-full gap-4">
            <Text size="lg" bold className="text-center">
              {isError
                ? "촬영 결과를 불러오지 못했습니다."
                : "저장된 촬영 사진이 없습니다."}
            </Text>
            {isError ? (
              <>
                <Text className="text-center text-label-muted">
                  잠시 후 다시 시도해주세요.
                </Text>
                <Button variant="outline" onPress={() => void refetch()}>
                  <ButtonText>다시 시도</ButtonText>
                </Button>
              </>
            ) : null}
            <Button variant="ghost" onPress={onDone}>
              <ButtonText>나가기</ButtonText>
            </Button>
          </VStack>
        </Center>
      </SafeAreaView>
    );
  }

  return (
    <RtcSessionResult
      images={images}
      maxSelection={RTC_MAX_SELECTED_PHOTOS}
      isPending={isPending && images.length === 0}
      isFetchingNextPage={isFetchingNextPage}
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
      }}
      onDone={onDone}
    />
  );
}
