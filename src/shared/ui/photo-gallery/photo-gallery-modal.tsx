import { colors } from "@shared/constants";
import {
  IconCircle,
  IconCircleCheck,
  IconX,
} from "@tabler/icons-react-native";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import {
  Modal,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, ButtonIcon } from "../button";
import { Pressable } from "../pressable";
import { SlidePageView } from "../slide-page-view";
import { Text } from "../text";
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
      visible
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.container}>
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

        <SafeAreaView
          pointerEvents="box-none"
          edges={["top", "bottom"]}
          style={StyleSheet.absoluteFill}
        >
          <View style={styles.topBar}>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 rounded-full bg-black/45"
              onPress={onClose}
              accessibilityLabel="사진 상세 닫기"
            >
              <ButtonIcon
                as={IconX}
                className="h-7 w-7 text-white"
              />
            </Button>
            <Text
              className="rounded-full bg-black/45 px-4 py-2 text-white"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {activeIndex + 1} / {images.length}
            </Text>
          </View>

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
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  imagePage: {
    flex: 1,
    backgroundColor: "#000000",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
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
