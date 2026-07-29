import {
  rtcStoredPhotoQuery,
  type RtcStoredPhoto,
} from "@entities/rtc-stored-photo";
import {
  mergeUniqueRtcStoredPhotos,
  RTC_STORED_PHOTO_GALLERY_CONFIG,
  useActiveRtcStoredPhotos,
} from "@features/rtc-photo/browse-stored-photos";
import {
  Button,
  ButtonText,
  Pressable,
  Skeleton,
  Text,
  VStack,
} from "@shared/ui";
import { Image } from "expo-image";
import { router } from "expo-router";
import { memo, useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

function PreviewLoadingCard() {
  return (
    <View style={styles.card}>
      <Skeleton variant="sharp" />
    </View>
  );
}

interface PreviewErrorCardProps {
  onRetry: () => void;
}

function PreviewErrorCard({ onRetry }: PreviewErrorCardProps) {
  return (
    <View style={[styles.card, styles.errorCard]}>
      <VStack className="items-center gap-3">
        <Text className="text-label-muted">
          촬영 사진을 불러오지 못했습니다.
        </Text>
        <Button variant="outline" size="sm" onPress={onRetry}>
          <ButtonText>다시 시도</ButtonText>
        </Button>
      </VStack>
    </View>
  );
}

function getDisplayablePhotos(
  photos: RtcStoredPhoto[],
  failedPhotoIds: Set<string>,
) {
  return photos.filter(({ id }) => !failedPhotoIds.has(id));
}

export const ProfileRtcPhotoPreview = memo(
  function ProfileRtcPhotoPreview() {
    const photosQuery =
      rtcStoredPhotoQuery.useReadMyRtcStoredPhotos({
        take: RTC_STORED_PHOTO_GALLERY_CONFIG.pageSize,
      });
    const photos = useMemo(
      () =>
        mergeUniqueRtcStoredPhotos(
          photosQuery.data?.pages,
        ),
      [photosQuery.data?.pages],
    );
    const activePhotos = useActiveRtcStoredPhotos(photos);
    const [failedPhotoIds, setFailedPhotoIds] = useState(
      () => new Set<string>(),
    );
    const [currentIndex, setCurrentIndex] = useState(0);
    const displayablePhotos = useMemo(
      () => getDisplayablePhotos(activePhotos, failedPhotoIds),
      [activePhotos, failedPhotoIds],
    );
    const currentPhoto =
      displayablePhotos.length > 0
        ? displayablePhotos[
            currentIndex % displayablePhotos.length
          ]
        : null;

    useEffect(() => {
      if (displayablePhotos.length <= 1) return;

      const timeout = setTimeout(() => {
        setCurrentIndex(
          (index) => (index + 1) % displayablePhotos.length,
        );
      }, RTC_STORED_PHOTO_GALLERY_CONFIG.previewIntervalMs);

      return () => clearTimeout(timeout);
    }, [currentIndex, displayablePhotos.length]);

    const handleRetry = () => {
      setFailedPhotoIds(new Set());
      void photosQuery.refetch();
    };

    if (photosQuery.isPending) {
      return <PreviewLoadingCard />;
    }
    if (photosQuery.isError) {
      return <PreviewErrorCard onRetry={handleRetry} />;
    }
    if (activePhotos.length === 0) {
      return null;
    }
    if (!currentPhoto) {
      return <PreviewErrorCard onRetry={handleRetry} />;
    }

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="최근 RTC 촬영 사진 전체 보기"
        onPress={() => router.push("/profile/rtc-photos")}
      >
        <View style={styles.card}>
          <Image
            source={currentPhoto.imageUrl}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={
              RTC_STORED_PHOTO_GALLERY_CONFIG.previewTransitionMs
            }
            style={StyleSheet.absoluteFill}
            onError={() =>
              setFailedPhotoIds(
                (current) =>
                  new Set(current).add(currentPhoto.id),
              )
            }
          />
          <View style={styles.scrim} />
          <VStack style={styles.label}>
            <Text className="text-white font-semibold" size="lg">
              최근 촬영 사진
            </Text>
            <Text className="text-white/85" size="sm">
              {displayablePhotos.length}장 · 눌러서 전체 보기
            </Text>
          </VStack>
        </View>
      </Pressable>
    );
  },
);

const styles = StyleSheet.create({
  card: {
    width: "100%",
    height: 190,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#eeeeee",
  },
  errorCard: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#d1d1d1",
    backgroundColor: "white",
  },
  scrim: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(0, 0, 0, 0.24)",
  },
  label: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 18,
  },
});
