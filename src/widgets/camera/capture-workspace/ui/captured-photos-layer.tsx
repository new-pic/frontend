import type { SessionPhoto } from "@features/camera/capture-photo";
import { useSaveImagesToLibrary } from "@features/photo/save-images-to-library";
import { useAppTranslation } from "@shared/lib";
import {
  Box,
  Button,
  ButtonIcon,
  ButtonText,
  HStack,
  PhotoGalleryModal,
  PhotoGrid,
  Pressable,
  Text,
  VStack,
} from "@shared/ui";
import { IconChevronLeft } from "@tabler/icons-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, BackHandler, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface CapturedPhotosLayerProps {
  open: boolean;
  photos: SessionPhoto[];
  onClose: () => void;
}

export function CapturedPhotosLayer({
  open,
  photos,
  onClose,
}: CapturedPhotosLayerProps) {
  const { t } = useAppTranslation();
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(
    () => new Set(),
  );
  const { isSaving, saveImages } = useSaveImagesToLibrary();
  const images = useMemo(
    () =>
      photos.map(({ id, uri }) => ({
        id,
        imageUrl: uri,
      })),
    [photos],
  );
  const selectedImages = useMemo(
    () => images.filter(({ id }) => selectedPhotoIds.has(id)),
    [images, selectedPhotoIds],
  );
  const isAllSelected =
    images.length > 0 && selectedImages.length === images.length;

  useEffect(() => {
    if (!open) {
      setGalleryIndex(null);
      setSelectedPhotoIds(new Set());
    }
  }, [open]);

  const handleClose = useCallback(() => {
    if (isSaving) return;

    setGalleryIndex(null);
    setSelectedPhotoIds(new Set());
    onClose();
  }, [isSaving, onClose]);

  const handleTogglePhoto = useCallback(
    ({ id }: { id: string }) => {
      if (isSaving) return;

      setSelectedPhotoIds((previousIds) => {
        const nextIds = new Set(previousIds);
        if (nextIds.has(id)) {
          nextIds.delete(id);
        } else {
          nextIds.add(id);
        }
        return nextIds;
      });
    },
    [isSaving],
  );

  const handleToggleAll = useCallback(() => {
    if (isSaving) return;

    setSelectedPhotoIds(
      isAllSelected ? new Set() : new Set(images.map(({ id }) => id)),
    );
  }, [images, isAllSelected, isSaving]);

  const handleSaveSelectedPhotos = useCallback(async () => {
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

    setSelectedPhotoIds(new Set(result.failedImageIds));
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
  }, [isSaving, saveImages, selectedImages, t]);

  useEffect(() => {
    if (!open) return;

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (isSaving) return true;

        if (galleryIndex !== null) {
          setGalleryIndex(null);
          return true;
        }

        handleClose();
        return true;
      },
    );

    return () => subscription.remove();
  }, [galleryIndex, handleClose, isSaving, open]);

  if (!open) return null;

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 60,
        backgroundColor: "white",
      }}
    >
      <SafeAreaView
        edges={["top", "bottom"]}
        style={{ flex: 1, backgroundColor: "white" }}
      >
        <VStack className="flex-1 bg-white pt-4">
          <HStack className="items-center justify-between border-b border-outline-light px-6 py-3">
            <Box className="w-20">
              <Button
                variant="ghost"
                size="icon"
                disabled={isSaving}
                onPress={handleClose}
                accessibilityLabel={t("camera.closeCapturedPhotos")}
              >
                <ButtonIcon as={IconChevronLeft} />
              </Button>
            </Box>
            <Text size="lg" className="font-paperlogy-semibold">
              {t("camera.capturedPhotos")}
            </Text>
            <Pressable
              className="w-20 items-end"
              disabled={images.length === 0 || isSaving}
              onPress={handleToggleAll}
              accessibilityRole="button"
              accessibilityLabel={
                isAllSelected
                  ? t("camera.deselectAllPhotos")
                  : t("camera.selectAllPhotos")
              }
            >
              <Text bold className="text-primary">
                {isAllSelected
                  ? t("common.actions.deselectAll")
                  : t("common.actions.selectAll")}
              </Text>
            </Pressable>
          </HStack>
          {images.length > 0 ? (
            <Text className="border-b border-outline-light px-6 py-3 text-label-muted">
              {t("camera.selectedCount", {
                selected: selectedImages.length,
                total: images.length,
              })}
            </Text>
          ) : null}
          <VStack className="flex-1">
            <PhotoGrid
              images={images}
              selectedImages={selectedImages}
              columns={3}
              emptyMessage={t("camera.noCapturedPhotos")}
              onPress={(_, index) => setGalleryIndex(index)}
              onSelectionPress={handleTogglePhoto}
            />
          </VStack>
          {images.length > 0 ? (
            <VStack className="border-t border-outline-light px-6 py-4">
              <Button
                variant="gradient"
                size="lg"
                disabled={selectedImages.length === 0 || isSaving}
                isLoading={isSaving}
                onPress={() => void handleSaveSelectedPhotos()}
                accessibilityLabel={t("camera.saveSelectedAccessibility", {
                  count: selectedImages.length,
                })}
              >
                <ButtonText>
                  {t("camera.saveSelected", {
                    count: selectedImages.length,
                  })}
                </ButtonText>
              </Button>
            </VStack>
          ) : null}
        </VStack>
      </SafeAreaView>

      <PhotoGalleryModal
        open={galleryIndex !== null}
        images={images}
        initialIndex={galleryIndex ?? 0}
        selectedImageIds={selectedPhotoIds}
        onToggleSelection={handleTogglePhoto}
        onClose={() => setGalleryIndex(null)}
      />
    </View>
  );
}
