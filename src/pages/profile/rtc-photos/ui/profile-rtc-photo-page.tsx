import { rtcStoredPhotoQuery } from "@entities/rtc-stored-photo";
import {
  mergeUniqueRtcStoredPhotos,
  RTC_STORED_PHOTO_GALLERY_CONFIG,
  RtcStoredPhotoCreatedAt,
  RtcStoredPhotoExpiryBadge,
  useActiveRtcStoredPhotos,
} from "@features/rtc-photo/browse-stored-photos";
import { useSaveRtcStoredPhoto } from "@features/rtc-photo/save-stored-photo";
import { useAppTranslation } from "@shared/lib";
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

export function ProfileRtcPhotoPage() {
  const { t } = useAppTranslation();
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetching,
    isFetchingNextPage,
    isPending,
    isRefetching,
    refetch,
  } = rtcStoredPhotoQuery.useReadMyRtcStoredPhotos({
    take: RTC_STORED_PHOTO_GALLERY_CONFIG.pageSize,
  });
  const photos = useMemo(
    () => mergeUniqueRtcStoredPhotos(data?.pages),
    [data?.pages],
  );
  const activePhotos = useActiveRtcStoredPhotos(photos);
  const { isSaving, savePhoto } = useSaveRtcStoredPhoto();

  const handleDownloadPhoto = async (photo: (typeof activePhotos)[number]) => {
    const result = await savePhoto(photo);

    if (result === "SAVED") {
      Alert.alert(t("photo.savedTitle"), t("photo.currentSaved"));
      return;
    }
    if (result === "PERMISSION_DENIED") {
      Alert.alert(
        t("photo.permissionTitle"),
        t("photo.currentSavePermissionDescription"),
      );
      return;
    }
    if (result === "EXPIRED") {
      Alert.alert(t("photo.expiredTitle"), t("photo.expired"));
      return;
    }
    if (result === "FAILED") {
      Alert.alert(t("photo.saveFailedTitle"), t("photo.saveFailed"));
    }
  };

  const handleEndReached = () => {
    if (!hasNextPage || isFetching || isFetchingNextPage) {
      return;
    }
    void fetchNextPage();
  };

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
      <VStack className="flex-1">
        <HStack className="items-center justify-between border-b border-outline-light px-6 py-3">
          <Button
            variant="ghost"
            size="icon"
            accessibilityLabel={t("common.accessibility.backToProfile")}
            onPress={() => router.back()}
          >
            <ButtonIcon as={IconChevronLeft} />
          </Button>
          <Text className="font-paperlogy-semibold" size="lg">
            {t("profile.recentRtcPhotos")}
          </Text>
          <Box className="w-12" />
        </HStack>

        {isError ? (
          <Center className="flex-1 px-6">
            <VStack className="w-full items-center gap-4">
              <Text className="text-label-muted">
                {t("profile.rtcPhotosLoadFailed")}
              </Text>
              <Button variant="outline" onPress={() => void refetch()}>
                <ButtonText>{t("common.actions.retry")}</ButtonText>
              </Button>
            </VStack>
          </Center>
        ) : (
          <PhotoGrid
            images={activePhotos}
            onPress={(_, index) => setGalleryIndex(index)}
            onEndReached={handleEndReached}
            onRefresh={() => void refetch()}
            refreshing={isRefetching && !isFetchingNextPage}
            emptyMessage={t("profile.rtcPhotosEmpty")}
            isPending={isPending}
            isFetchingNextPage={isFetchingNextPage}
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
              isSaving ? t("photo.saving") : t("photo.downloadCurrent")
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
