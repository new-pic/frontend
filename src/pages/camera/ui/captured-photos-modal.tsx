import type { SessionPhoto } from "@features/camera/capture-photo";
import {
  Button,
  ButtonIcon,
  HStack,
  PhotoGalleryModal,
  PhotoGrid,
  Text,
  VStack,
} from "@shared/ui";
import { IconX } from "@tabler/icons-react-native";
import { useMemo, useState } from "react";
import { Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface CapturedPhotosModalProps {
  open: boolean;
  photos: SessionPhoto[];
  onClose: () => void;
}

export function CapturedPhotosModal({
  open,
  photos,
  onClose,
}: CapturedPhotosModalProps) {
  const [galleryIndex, setGalleryIndex] = useState<number | null>(
    null,
  );
  const images = useMemo(
    () =>
      photos.map(({ id, uri }) => ({
        id,
        imageUrl: uri,
      })),
    [photos],
  );

  if (!open) return null;

  return (
    <>
      <Modal
        animationType="slide"
        visible
        onRequestClose={onClose}
      >
        <SafeAreaView
          edges={["top", "bottom"]}
          style={{ flex: 1, backgroundColor: "white" }}
        >
          <VStack className="flex-1 bg-white">
            <HStack className="items-center justify-between border-b border-outline-light px-4 py-3">
              <Text size="xl" bold>
                촬영한 사진
              </Text>
              <Button
                variant="ghost"
                size="icon"
                onPress={onClose}
                accessibilityLabel="촬영한 사진 목록 닫기"
              >
                <ButtonIcon as={IconX} className="h-7 w-7" />
              </Button>
            </HStack>
            <VStack className="flex-1">
              <PhotoGrid
                images={images}
                columns={3}
                emptyMessage="아직 촬영한 사진이 없습니다."
                onPress={(_, index) => setGalleryIndex(index)}
              />
            </VStack>
          </VStack>
        </SafeAreaView>
      </Modal>

      <PhotoGalleryModal
        open={galleryIndex !== null}
        images={images}
        initialIndex={galleryIndex ?? 0}
        onClose={() => setGalleryIndex(null)}
      />
    </>
  );
}
