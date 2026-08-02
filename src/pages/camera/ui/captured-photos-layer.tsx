import type { SessionPhoto } from "@features/camera/capture-photo";
import {
  Box,
  Button,
  ButtonIcon,
  HStack,
  PhotoGalleryModal,
  PhotoGrid,
  Text,
  VStack,
} from "@shared/ui";
import { IconChevronLeft } from "@tabler/icons-react-native";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { BackHandler, View } from "react-native";
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

  useEffect(() => {
    if (!open) setGalleryIndex(null);
  }, [open]);

  const handleClose = useCallback(() => {
    setGalleryIndex(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (galleryIndex !== null) {
          setGalleryIndex(null);
          return true;
        }

        handleClose();
        return true;
      },
    );

    return () => subscription.remove();
  }, [galleryIndex, handleClose, open]);

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
            <Button
              variant="ghost"
              size="icon"
              onPress={handleClose}
              accessibilityLabel="촬영한 사진 목록 닫기"
            >
              <ButtonIcon as={IconChevronLeft} />
            </Button>
            <Text size="lg" className="font-semibold">
              촬영한 사진
            </Text>
            <Box className="w-12" />
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

      <PhotoGalleryModal
        open={galleryIndex !== null}
        images={images}
        initialIndex={galleryIndex ?? 0}
        onClose={() => setGalleryIndex(null)}
      />
    </View>
  );
}
