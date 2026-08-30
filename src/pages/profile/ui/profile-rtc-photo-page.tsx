import {
  mergeUniqueRtcStoredPhotos,
  RTC_STORED_PHOTO_GALLERY_CONFIG,
  RtcStoredPhotoCreatedAt,
  RtcStoredPhotoExpiryBadge,
  useActiveRtcStoredPhotos,
} from "@features/rtc-photo/browse-stored-photos";
import { useSaveRtcStoredPhoto } from "@features/rtc-photo/save-stored-photo";
import {
  Box,
  Button,
  ButtonIcon,
  ButtonText,
  Center,
  HStack,
  PhotoGalleryModal,
  PhotoGrid,
  Text,
  VStack,
} from "@shared/ui";
import { IconChevronLeft, IconDownload } from "@tabler/icons-react-native";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { rtcStoredPhotoQuery } from "../api";

export function ProfileRtcPhotoPage() {
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const photosQuery = rtcStoredPhotoQuery.useReadMyRtcStoredPhotos({
    take: RTC_STORED_PHOTO_GALLERY_CONFIG.pageSize,
  });
  const photos = useMemo(
    () => mergeUniqueRtcStoredPhotos(photosQuery.data?.pages),
    [photosQuery.data?.pages],
  );
  const activePhotos = useActiveRtcStoredPhotos(photos);
  const { isSaving, savePhoto } = useSaveRtcStoredPhoto();

  const handleDownloadPhoto = async (photo: (typeof activePhotos)[number]) => {
    const result = await savePhoto(photo);

    if (result === "SAVED") {
      Alert.alert("사진 저장 완료", "현재 사진을 사진 보관함에 저장했습니다.");
      return;
    }
    if (result === "PERMISSION_DENIED") {
      Alert.alert(
        "사진 권한 필요",
        "사진을 저장하려면 사진 보관함 추가 권한이 필요합니다.",
      );
      return;
    }
    if (result === "EXPIRED") {
      Alert.alert("사진 만료", "사진 보관 기간이 지나 저장할 수 없습니다.");
      return;
    }
    if (result === "FAILED") {
      Alert.alert(
        "사진 저장 실패",
        "사진을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.",
      );
    }
  };

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
            accessibilityLabel="프로필로 돌아가기"
            onPress={() => router.back()}
          >
            <ButtonIcon as={IconChevronLeft} />
          </Button>
          <Text className="font-semibold" size="lg">
            최근 촬영 사진
          </Text>
          <Box className="w-12" />
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
            onPress={(_, index) => setGalleryIndex(index)}
            onEndReached={handleEndReached}
            onRefresh={() => void photosQuery.refetch()}
            refreshing={
              photosQuery.isRefetching && !photosQuery.isFetchingNextPage
            }
            emptyMessage="보관 중인 촬영 사진이 없습니다."
            isPending={photosQuery.isPending}
            isFetchingNextPage={photosQuery.isFetchingNextPage}
          />
        )}
      </VStack>

      <PhotoGalleryModal
        open={galleryIndex !== null}
        images={activePhotos}
        initialIndex={galleryIndex ?? 0}
        renderHeaderRight={({ activeImage }) => (
          <Button
            variant="ghost"
            size="icon"
            disabled={isSaving}
            isLoading={isSaving}
            accessibilityLabel={
              isSaving ? "사진 저장 중" : "현재 사진 다운로드"
            }
            onPress={() => void handleDownloadPhoto(activeImage)}
          >
            <ButtonIcon as={IconDownload} />
          </Button>
        )}
        renderImageOverlay={({ activeImage }) => (
          <RtcStoredPhotoExpiryBadge expiresAt={activeImage.expiresAt} />
        )}
        renderFooterDetails={({ activeImage }) => (
          <RtcStoredPhotoCreatedAt createdAt={activeImage.createdAt} />
        )}
        onClose={() => setGalleryIndex(null)}
      />
    </SafeAreaView>
  );
}
