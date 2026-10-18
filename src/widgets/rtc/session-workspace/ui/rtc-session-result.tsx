import { RTC_MAX_SELECTED_PHOTOS } from "@entities/rtc-room";
import { useSaveImagesToLibrary } from "@features/photo/save-images-to-library";
import { useAppTranslation } from "@shared/lib";
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
  const { t } = useAppTranslation();
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
        t("rtc.result.selectionLimitTitle"),
        t("rtc.result.selectionLimit", { count: maxSelection }),
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
        t("photo.permissionTitle"),
        t("photo.savePermissionDescription"),
      );
      return;
    }

    setSelectedImageIds(new Set(result.failedImageIds));
    if (result.status === "SAVED") {
      Alert.alert(
        t("photo.savedTitle"),
        t("photo.savedCount", { count: result.savedCount }),
      );
      return;
    }
    if (result.status === "PARTIALLY_SAVED") {
      Alert.alert(
        t("photo.partiallySavedTitle"),
        t("photo.partiallySaved", {
          savedCount: result.savedCount,
          failedCount: result.failedImageIds.length,
        }),
      );
      return;
    }

    Alert.alert(t("photo.saveFailedTitle"), t("photo.saveFailed"));
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <VStack className="flex-1 bg-white">
        <VStack className="gap-2 border-b border-outline-light px-6 py-4">
          <HStack className="items-center justify-between">
            <Text size="xl" bold>
              {t("rtc.result.sharedPhotos")}
            </Text>
            <Pressable
              disabled={images.length === 0 || isSaving || isPending}
              onPress={handleToggleAll}
              accessibilityRole="button"
              accessibilityLabel={
                isAllSelectableSelected
                  ? t("common.actions.deselectAll")
                  : t("rtc.result.maxSelectAccessibility", {
                      count: maxSelection,
                    })
              }
            >
              <Text bold className="text-primary">
                {isAllSelectableSelected
                  ? t("common.actions.deselectAll")
                  : images.length > maxSelection
                    ? t("rtc.result.maxSelect", { count: maxSelection })
                    : t("common.actions.selectAll")}
              </Text>
            </Pressable>
          </HStack>
          <Text className="text-label-muted">
            {t("rtc.result.selectedMaximum", {
              selected: selectedImages.length,
              maximum: maxSelection,
            })}
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
            accessibilityLabel={t("rtc.result.saveAccessibility", {
              count: selectedImages.length,
            })}
          >
            <ButtonText>
              {t("rtc.result.saveSelected", {
                count: selectedImages.length,
              })}
            </ButtonText>
          </Button>
          <Button
            variant="outline"
            size="lg"
            disabled={isSaving}
            onPress={onDone}
          >
            <ButtonText>{t("rtc.result.done")}</ButtonText>
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
