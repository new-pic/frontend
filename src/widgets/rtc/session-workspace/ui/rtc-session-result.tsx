import { RTC_MAX_SELECTED_PHOTOS } from "@entities/rtc-room";
import { useSaveImagesToLibrary } from "@features/photo/save-images-to-library";
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
import { useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export interface RtcSessionResultImage {
  id: string;
  imageUrl: string;
}

interface RtcSessionResultProps {
  images: RtcSessionResultImage[];
  onDone: () => void;
  maxSelection?: number;
  isPending?: boolean;
  isFetchingNextPage?: boolean;
  onEndReached?: () => void;
}

export function RtcSessionResult({
  images,
  onDone,
  maxSelection = RTC_MAX_SELECTED_PHOTOS,
  isPending = false,
  isFetchingNextPage = false,
  onEndReached,
}: RtcSessionResultProps) {
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const { isSaving, saveImages } = useSaveImagesToLibrary();

  useEffect(() => {
    const availableImageIds = new Set(images.map((image) => image.id));
    setSelectedImageIds(
      (previousIds) =>
        new Set(
          [...previousIds]
            .filter((id) => availableImageIds.has(id))
            .slice(0, maxSelection),
        ),
    );
  }, [images, maxSelection]);

  const selectedImages = useMemo(
    () => images.filter((image) => selectedImageIds.has(image.id)),
    [images, selectedImageIds],
  );
  const selectableImages = useMemo(
    () => images.slice(0, maxSelection),
    [images, maxSelection],
  );
  const isAllSelectableSelected =
    selectableImages.length > 0 &&
    selectableImages.every(({ id }) => selectedImageIds.has(id));

  const handleToggleImage = (image: RtcSessionResultImage) => {
    if (isSaving) return;

    if (selectedImageIds.has(image.id)) {
      setSelectedImageIds((previousIds) => {
        const nextIds = new Set(previousIds);
        nextIds.delete(image.id);
        return nextIds;
      });
      return;
    }

    if (selectedImageIds.size >= maxSelection) {
      Alert.alert(
        "사진 선택 한도",
        `사진은 최대 ${maxSelection}장까지 선택할 수 있습니다.`,
      );
      return;
    }

    setSelectedImageIds((previousIds) => new Set(previousIds).add(image.id));
  };

  const handleToggleAll = () => {
    if (isSaving) return;

    setSelectedImageIds(
      isAllSelectableSelected
        ? new Set()
        : new Set(selectableImages.map(({ id }) => id)),
    );
  };

  const handleSaveSelectedImages = async () => {
    if (selectedImages.length === 0 || isSaving) return;

    const result = await saveImages(selectedImages);
    if (result.status === "BUSY") return;
    if (result.status === "PERMISSION_DENIED") {
      Alert.alert(
        "사진 권한 필요",
        "선택한 사진을 저장하려면 사진 보관함 추가 권한이 필요합니다.",
      );
      return;
    }

    setSelectedImageIds(new Set(result.failedImageIds));
    if (result.status === "SAVED") {
      Alert.alert(
        "사진 저장 완료",
        `${result.savedCount}장의 사진을 사진 보관함에 저장했습니다.`,
      );
      return;
    }
    if (result.status === "PARTIALLY_SAVED") {
      Alert.alert(
        "일부 사진 저장 실패",
        `${result.savedCount}장은 저장했고, ${result.failedImageIds.length}장은 저장하지 못했습니다. 실패한 사진을 다시 시도해주세요.`,
      );
      return;
    }

    Alert.alert(
      "사진 저장 실패",
      "선택한 사진을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.",
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <VStack className="flex-1 bg-white">
        <VStack className="gap-2 border-b border-outline-light px-6 py-4">
          <HStack className="items-center justify-between">
            <Text size="xl" bold>
              공유 사진
            </Text>
            <Pressable
              disabled={images.length === 0 || isSaving || isPending}
              onPress={handleToggleAll}
              accessibilityRole="button"
              accessibilityLabel={
                isAllSelectableSelected
                  ? "전체 선택 해제"
                  : `최대 ${maxSelection}장 선택`
              }
            >
              <Text bold className="text-primary">
                {isAllSelectableSelected
                  ? "전체 해제"
                  : images.length > maxSelection
                    ? `${maxSelection}장 선택`
                    : "전체 선택"}
              </Text>
            </Pressable>
          </HStack>
          <Text className="text-label-muted">
            선택됨 {selectedImages.length} / 최대 {maxSelection}장
          </Text>
        </VStack>

        <VStack className="flex-1">
          <PhotoGrid
            images={images}
            selectedImages={selectedImages}
            columns={3}
            onPress={(_, index) => setGalleryIndex(index)}
            onSelectionPress={handleToggleImage}
            onEndReached={onEndReached}
            isPending={isPending}
            isFetchingNextPage={isFetchingNextPage}
          />
        </VStack>

        <VStack className="gap-3 border-t border-outline-light px-6 py-4">
          <Button
            variant="gradient"
            size="lg"
            disabled={selectedImages.length === 0 || isSaving || isPending}
            isLoading={isSaving}
            onPress={() => void handleSaveSelectedImages()}
            accessibilityLabel={`${selectedImages.length}장의 선택한 사진 저장`}
          >
            <ButtonText>
              {`선택한 사진 저장 (${selectedImages.length})`}
            </ButtonText>
          </Button>
          <Button
            variant="outline"
            size="lg"
            disabled={isSaving}
            onPress={onDone}
          >
            <ButtonText>완료</ButtonText>
          </Button>
        </VStack>
      </VStack>
      <PhotoGalleryModal
        open={galleryIndex !== null}
        images={images}
        initialIndex={galleryIndex ?? 0}
        selectedImageIds={selectedImageIds}
        onToggleSelection={handleToggleImage}
        onClose={() => setGalleryIndex(null)}
      />
    </SafeAreaView>
  );
}
