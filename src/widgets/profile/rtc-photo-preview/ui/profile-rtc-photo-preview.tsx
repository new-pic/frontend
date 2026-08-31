import {
  rtcStoredPhotoQuery,
  type RtcStoredPhoto,
} from "@entities/rtc-stored-photo";
import {
  mergeUniqueRtcStoredPhotos,
  RTC_STORED_PHOTO_GALLERY_CONFIG,
  useActiveRtcStoredPhotos,
} from "@features/rtc-photo/browse-stored-photos";
import { Box, Image, Pressable, Text, VStack } from "@shared/ui";
import { memo, useEffect, useMemo, useState } from "react";

function getDisplayablePhotos(
  photos: RtcStoredPhoto[],
  failedPhotoIds: Set<string>,
) {
  return photos.filter(({ id }) => !failedPhotoIds.has(id));
}

interface ProfileRtcPhotoPreviewProps {
  onPress: () => void;
}

export const ProfileRtcPhotoPreview = memo(function ProfileRtcPhotoPreview({
  onPress,
}: ProfileRtcPhotoPreviewProps) {
  const { data, isSuccess: isStoredPhotoSuccess } =
    rtcStoredPhotoQuery.useReadMyRtcStoredPhotos({
      take: RTC_STORED_PHOTO_GALLERY_CONFIG.pageSize,
    });
  const photos = useMemo(
    () => mergeUniqueRtcStoredPhotos(data?.pages),
    [data?.pages],
  );
  const activePhotos = useActiveRtcStoredPhotos(photos);
  const [failedPhotoIds, setFailedPhotoIds] = useState(() => new Set<string>());
  const [currentIndex, setCurrentIndex] = useState(0);
  const displayablePhotos = useMemo(
    () => getDisplayablePhotos(activePhotos, failedPhotoIds),
    [activePhotos, failedPhotoIds],
  );
  const currentPhoto =
    displayablePhotos.length > 0
      ? displayablePhotos[currentIndex % displayablePhotos.length]
      : null;

  useEffect(() => {
    if (displayablePhotos.length <= 1) return;

    const timeout = setTimeout(() => {
      setCurrentIndex((index) => (index + 1) % displayablePhotos.length);
    }, RTC_STORED_PHOTO_GALLERY_CONFIG.previewIntervalMs);

    return () => clearTimeout(timeout);
  }, [currentIndex, displayablePhotos.length]);

  if (!isStoredPhotoSuccess || !currentPhoto) {
    return null;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="최근 RTC 촬영 사진 전체 보기"
      onPress={onPress}
    >
      <Box className="h-47.5 w-full overflow-hidden rounded-3xl bg-background-muted">
        <Image
          className="absolute inset-0"
          source={currentPhoto.imageUrl}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={RTC_STORED_PHOTO_GALLERY_CONFIG.previewTransitionMs}
          onError={() =>
            setFailedPhotoIds((current) =>
              new Set(current).add(currentPhoto.id),
            )
          }
        />
        <Box className="absolute inset-0 bg-black/25" />
        <VStack className="absolute right-5 bottom-4.5 left-5">
          <Text className="text-white font-semibold" size="lg">
            최근 촬영 사진
          </Text>
          <Text className="text-white/85" size="sm">
            {displayablePhotos.length}장 · 눌러서 전체 보기
          </Text>
        </VStack>
      </Box>
    </Pressable>
  );
});
