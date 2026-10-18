import { RTC_MAX_SELECTED_PHOTOS } from "@entities/rtc-room";
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
import { useMemo, useState } from "react";
import { Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { RtcEndSelectablePhoto } from "../model/models";

export interface RtcEndPhotoSelectionProps {
  photos: RtcEndSelectablePhoto[];
  onConfirm: (photos: RtcEndSelectablePhoto[]) => void;
}

export function RtcEndPhotoSelection({
  photos,
  onConfirm,
}: RtcEndPhotoSelectionProps) {
  const { t } = useAppTranslation();
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
      t("rtc.result.selectionLimitTitle"),
      t("rtc.result.roomSelectionLimit", {
        count: RTC_MAX_SELECTED_PHOTOS,
      }),
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
              {t("rtc.result.selectTitle")}
            </Text>
            <Pressable
              disabled={photos.length === 0 || isConfirming}
              onPress={handleToggleAll}
              accessibilityRole="button"
              accessibilityLabel={
                isAllSelectableSelected
                  ? t("common.actions.deselectAll")
                  : t("rtc.result.maxSelectAccessibility", {
                      count: RTC_MAX_SELECTED_PHOTOS,
                    })
              }
            >
              <Text bold className="text-primary">
                {isAllSelectableSelected
                  ? t("common.actions.deselectAll")
                  : photos.length > RTC_MAX_SELECTED_PHOTOS
                    ? t("rtc.result.maxSelect", {
                        count: RTC_MAX_SELECTED_PHOTOS,
                      })
                    : t("common.actions.selectAll")}
              </Text>
            </Pressable>
          </HStack>
          <Text className="text-label-muted">
            {t("rtc.result.selectionDescription", {
              count: RTC_MAX_SELECTED_PHOTOS,
            })}
          </Text>
          <Text className="text-label-muted">
            {t("rtc.result.selected", {
              selected: selectedPhotos.length,
              maximum: RTC_MAX_SELECTED_PHOTOS,
            })}
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
                ? t("rtc.result.saveAndEnd", {
                    count: selectedPhotos.length,
                  })
                : t("rtc.result.endWithoutPhotos")}
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
