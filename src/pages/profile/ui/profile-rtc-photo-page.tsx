import { rtcStoredPhotoQuery } from "@entities/rtc-stored-photo";
import {
  mergeUniqueRtcStoredPhotos,
  RTC_STORED_PHOTO_GALLERY_CONFIG,
  useActiveRtcStoredPhotos,
} from "@features/rtc-photo/browse-stored-photos";
import {
  Box,
  Button,
  ButtonIcon,
  ButtonText,
  Center,
  HStack,
  PhotoGrid,
  Text,
  VStack,
} from "@shared/ui";
import { IconChevronLeft } from "@tabler/icons-react-native";
import { router } from "expo-router";
import { useMemo } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

export function ProfileRtcPhotoPage() {
  const photosQuery =
    rtcStoredPhotoQuery.useReadMyRtcStoredPhotos({
      take: RTC_STORED_PHOTO_GALLERY_CONFIG.pageSize,
    });
  const photos = useMemo(
    () =>
      mergeUniqueRtcStoredPhotos(photosQuery.data?.pages),
    [photosQuery.data?.pages],
  );
  const activePhotos = useActiveRtcStoredPhotos(photos);

  const handleEndReached = () => {
    if (
      !photosQuery.hasNextPage ||
      photosQuery.isFetching ||
      photosQuery.isFetchingNextPage
    ) {
      return;
    }
    void photosQuery.fetchNextPage();
  };

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
      <VStack className="flex-1">
        <HStack className="items-center justify-between border-b border-outline-light px-6 py-3">
          <Button
            variant="ghost"
            size="icon"
            onPress={() => router.back()}
          >
            <ButtonIcon as={IconChevronLeft} />
          </Button>
          <Text className="font-semibold" size="lg">
            최근 촬영 사진
          </Text>
          <Box className="w-10" />
        </HStack>

        {photosQuery.isError ? (
          <Center className="flex-1 px-6">
            <VStack className="w-full items-center gap-4">
              <Text className="text-label-muted">
                촬영 사진을 불러오지 못했습니다.
              </Text>
              <Button
                variant="outline"
                onPress={() => void photosQuery.refetch()}
              >
                <ButtonText>다시 시도</ButtonText>
              </Button>
            </VStack>
          </Center>
        ) : (
          <PhotoGrid
            images={activePhotos}
            onEndReached={handleEndReached}
            onRefresh={() => void photosQuery.refetch()}
            refreshing={
              photosQuery.isRefetching &&
              !photosQuery.isFetchingNextPage
            }
            emptyMessage="보관 중인 촬영 사진이 없습니다."
            isPending={photosQuery.isPending}
            isFetchingNextPage={photosQuery.isFetchingNextPage}
          />
        )}
      </VStack>
    </SafeAreaView>
  );
}
