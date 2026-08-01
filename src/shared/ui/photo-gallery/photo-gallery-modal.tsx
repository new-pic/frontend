import { colors } from "@shared/constants";
import {
  IconCircle,
  IconCircleCheck,
  IconChevronLeft,
} from "@tabler/icons-react-native";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import {
  Modal,
  StyleSheet,
  View,
} from "react-native";
import {
  SafeAreaProvider,
  SafeAreaView,
} from "react-native-safe-area-context";
import { Box } from "../box";
import { Button, ButtonIcon } from "../button";
import { HStack } from "../hstack";
import { Pressable } from "../pressable";
import { SlidePageView } from "../slide-page-view";
import { Text } from "../text";
import { VStack } from "../vstack";
import { clampPhotoGalleryIndex } from "./photo-gallery-state";

export interface PhotoGalleryImage {
  id: string;
  imageUrl: string;
}

interface PhotoGalleryModalProps<
  T extends PhotoGalleryImage = PhotoGalleryImage,
> {
  open: boolean;
  images: T[];
  initialIndex: number;
  selectedImageIds?: ReadonlySet<string>;
  onToggleSelection?: (image: T) => void;
  onClose: () => void;
}

export function PhotoGalleryModal<
  T extends PhotoGalleryImage = PhotoGalleryImage,
>({
  open,
  images,
  initialIndex,
  selectedImageIds,
  onToggleSelection,
  onClose,
}: PhotoGalleryModalProps<T>) {
  const safeInitialIndex = clampPhotoGalleryIndex(
    initialIndex,
    images.length,
  );
  const [activeIndex, setActiveIndex] =
    useState(safeInitialIndex);
  const activeImage = images[activeIndex];

  useEffect(() => {
    if (open) setActiveIndex(safeInitialIndex);
  }, [open, safeInitialIndex]);

  if (!open || images.length === 0) return null;

  return (
    <Modal
      animationType="fade"
      presentationStyle="fullScreen"
      visible
      onRequestClose={onClose}
    >
      <SafeAreaProvider style={{ flex: 1 }}>
        <SafeAreaView
          edges={["top", "bottom"]}
          style={{ flex: 1, backgroundColor: "white" }}
        >
          <VStack className="flex-1 bg-white pt-4">
            <HStack className="items-center justify-between border-b border-outline-light px-6 py-3">
              <Button
                variant="ghost"
                size="icon"
                onPress={onClose}
                accessibilityLabel="사진 목록으로 돌아가기"
              >
                <ButtonIcon as={IconChevronLeft} />
              </Button>
              <Text size="lg" className="font-semibold">
                사진 미리보기
              </Text>
              <Box className="w-12" />
            </HStack>

            <VStack className="relative flex-1">
              <SlidePageView
                initialPage={safeInitialIndex}
                onPageSelected={setActiveIndex}
              >
                {images.map((image) => (
                  <SlidePageView.Item key={image.id}>
                    <View style={styles.imagePage}>
                      <Image
                        source={image.imageUrl}
                        contentFit="contain"
                        style={StyleSheet.absoluteFill}
                      />
                    </View>
                  </SlidePageView.Item>
                ))}
              </SlidePageView>

              {activeImage &&
              selectedImageIds &&
              onToggleSelection ? (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityLabel={
                    selectedImageIds.has(activeImage.id)
                      ? "현재 사진 선택 해제"
                      : "현재 사진 선택"
                  }
                  accessibilityState={{
                    checked: selectedImageIds.has(activeImage.id),
                  }}
                  onPress={() => onToggleSelection(activeImage)}
                  style={styles.selectionButton}
                >
                  {selectedImageIds.has(activeImage.id) ? (
                    <IconCircleCheck
                      size={28}
                      color="white"
                      fill={colors.brand.primary}
                    />
                  ) : (
                    <IconCircle size={28} color="white" />
                  )}
                  <Text bold className="text-white">
                    {selectedImageIds.has(activeImage.id)
                      ? "선택됨"
                      : "선택"}
                  </Text>
                </Pressable>
              ) : null}
            </VStack>

            <HStack className="items-center justify-center border-t border-outline-light px-6 py-4">
              <Text
                size="lg"
                className="font-semibold"
                style={{ fontVariant: ["tabular-nums"] }}
              >
                {activeIndex + 1} / {images.length}
              </Text>
            </HStack>
          </VStack>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  imagePage: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  selectionButton: {
    position: "absolute",
    right: 18,
    bottom: 18,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 16,
  },
});
