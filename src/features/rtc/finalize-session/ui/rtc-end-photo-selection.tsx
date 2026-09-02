import { RTC_MAX_SELECTED_PHOTOS } from "@entities/rtc-room";
import {
  Button,
  ButtonText,
  HStack,
  PhotoGalleryModal,
  PhotoGrid,
  Pressable,
  Text,
  VStack,
} from "@shared/ui";
import { useMemo, useState } from "react";
import { Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export interface RtcEndPhotoSelectionProps {
  photos: RtcEndSelectablePhoto[];
  onConfirm: (photos: RtcEndSelectablePhoto[]) => void;
}

export interface RtcEndSelectablePhoto {
  id: string;
  uri: string;
}

export function RtcEndPhotoSelection({
  photos,
  onConfirm,
}: RtcEndPhotoSelectionProps) {
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [isConfirming, setIsConfirming] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);

  const images = useMemo(
    () =>
      photos.map(({ id, uri }) => ({
        id,
        imageUrl: uri,
      })),
    [photos],
  );
  const selectedPhotos = useMemo(
    () => photos.filter(({ id }) => selectedPhotoIds.has(id)),
    [photos, selectedPhotoIds],
  );
  const selectablePhotos = useMemo(
    () => photos.slice(0, RTC_MAX_SELECTED_PHOTOS),
    [photos],
  );
  const isAllSelectableSelected =
    selectablePhotos.length > 0 &&
    selectablePhotos.every(({ id }) => selectedPhotoIds.has(id));

  const showSelectionLimitAlert = () => {
    Alert.alert(
      "사진 선택 한도",
      `방에 저장할 사진은 최대 ${RTC_MAX_SELECTED_PHOTOS}장까지 선택할 수 있습니다.`,
    );
  };

  const handleTogglePhoto = ({ id }: { id: string }) => {
    if (isConfirming) return;

    if (selectedPhotoIds.has(id)) {
      setSelectedPhotoIds((previousIds) => {
        const nextIds = new Set(previousIds);
        nextIds.delete(id);
        return nextIds;
      });
      return;
    }

    if (selectedPhotoIds.size >= RTC_MAX_SELECTED_PHOTOS) {
      showSelectionLimitAlert();
      return;
    }

    setSelectedPhotoIds((previousIds) => new Set(previousIds).add(id));
  };

  const handleToggleAll = () => {
    if (isConfirming) return;

    if (isAllSelectableSelected) {
      setSelectedPhotoIds(new Set());
      return;
    }

    setSelectedPhotoIds(new Set(selectablePhotos.map(({ id }) => id)));
  };

  const handleConfirm = () => {
    if (isConfirming) return;

    setIsConfirming(true);
    onConfirm(selectedPhotos);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
      <VStack className="flex-1 bg-white">
        <VStack className="gap-2 border-b border-outline-light px-6 py-4">
          <HStack className="items-center justify-between">
            <Text size="xl" bold>
              저장할 사진 선택
            </Text>
            <Pressable
              disabled={photos.length === 0 || isConfirming}
              onPress={handleToggleAll}
              accessibilityRole="button"
              accessibilityLabel={
                isAllSelectableSelected
                  ? "전체 선택 해제"
                  : `최대 ${RTC_MAX_SELECTED_PHOTOS}장 선택`
              }
            >
              <Text bold className="text-primary">
                {isAllSelectableSelected
                  ? "전체 해제"
                  : photos.length > RTC_MAX_SELECTED_PHOTOS
                    ? `${RTC_MAX_SELECTED_PHOTOS}장 선택`
                    : "전체 선택"}
              </Text>
            </Pressable>
          </HStack>
          <Text className="text-label-muted">
            촬영한 사진 중 최대 {RTC_MAX_SELECTED_PHOTOS}장을 방에 저장할 수
            있습니다.
          </Text>
          <Text className="text-label-muted">
            선택됨 {selectedPhotos.length} / {RTC_MAX_SELECTED_PHOTOS}
          </Text>
        </VStack>

        <VStack className="flex-1">
          <PhotoGrid
            images={images}
            selectedImages={selectedPhotos}
            columns={3}
            onPress={(_, index) => setGalleryIndex(index)}
            onSelectionPress={handleTogglePhoto}
          />
        </VStack>

        <VStack className="border-t border-outline-light px-6 py-4">
          <Button
            variant="gradient"
            size="lg"
            disabled={isConfirming}
            onPress={handleConfirm}
          >
            <ButtonText>
              {selectedPhotos.length > 0
                ? `${selectedPhotos.length}장 저장하고 종료`
                : "사진 없이 종료"}
            </ButtonText>
          </Button>
        </VStack>
      </VStack>
      <PhotoGalleryModal
        open={galleryIndex !== null}
        images={images}
        initialIndex={galleryIndex ?? 0}
        selectedImageIds={selectedPhotoIds}
        onToggleSelection={handleTogglePhoto}
        onClose={() => setGalleryIndex(null)}
      />
    </SafeAreaView>
  );
}
