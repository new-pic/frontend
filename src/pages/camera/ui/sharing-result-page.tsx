import { RTC_MAX_SELECTED_PHOTOS } from "@entities/rtc";
import {
  Button,
  ButtonSpinner,
  ButtonText,
  HStack,
  PhotoGalleryModal,
  PhotoGrid,
  Pressable,
  Text,
  VStack,
} from "@shared/ui";
import { File, Paths } from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import { useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export interface SharingResultImage {
  id: string;
  imageUrl: string;
}

export interface SharingResultPageProps {
  images: SharingResultImage[];
  onDone: () => void;
  maxSelection?: number;
  isPending?: boolean;
  isFetchingNextPage?: boolean;
  onEndReached?: () => void;
}

const REMOTE_URI_PATTERN = /^https:\/\//i;
const LOCAL_FILE_URI_PATTERN = /^file:\/\//i;
const IMAGE_EXTENSION_PATTERN = /\.(jpe?g|png|gif|webp|heic|heif)$/i;

function getRemoteImageExtension(uri: string): string {
  const pathWithoutQuery = uri.split(/[?#]/, 1)[0];
  return pathWithoutQuery.match(IMAGE_EXTENSION_PATTERN)?.[0] ?? ".jpg";
}

function getTemporaryImageFile(
  image: SharingResultImage,
  index: number,
): File {
  const safeId =
    image.id.replace(/[^a-z0-9_-]/gi, "-").slice(0, 40) || "image";
  const extension = getRemoteImageExtension(image.imageUrl);

  return new File(
    Paths.cache,
    `rtc-${safeId}-${Date.now()}-${index}${extension}`,
  );
}

async function saveImageToMediaLibrary(
  image: SharingResultImage,
  index: number,
): Promise<void> {
  if (!REMOTE_URI_PATTERN.test(image.imageUrl)) {
    if (!LOCAL_FILE_URI_PATTERN.test(image.imageUrl)) {
      throw new Error("지원하지 않는 사진 경로입니다.");
    }
    await MediaLibrary.Asset.create(image.imageUrl);
    return;
  }

  const temporaryFile = getTemporaryImageFile(image, index);

  try {
    const downloadedFile = await File.downloadFileAsync(
      image.imageUrl,
      temporaryFile,
      { idempotent: true },
    );
    await MediaLibrary.Asset.create(downloadedFile.uri);
  } finally {
    try {
      if (temporaryFile.exists) {
        temporaryFile.delete();
      }
    } catch {
      // 갤러리 저장 성공 여부와 무관한 캐시 정리 실패는 무시합니다.
    }
  }
}

export function SharingResultPage({
  images,
  onDone,
  maxSelection = RTC_MAX_SELECTED_PHOTOS,
  isPending = false,
  isFetchingNextPage = false,
  onEndReached,
}: SharingResultPageProps) {
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(
    null,
  );
  const [permissionResponse, requestPermission] =
    MediaLibrary.usePermissions({
      writeOnly: true,
      granularPermissions: ["photo"],
    });

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

  const showSelectionLimitAlert = () => {
    Alert.alert(
      "사진 선택 한도",
      `사진은 최대 ${maxSelection}장까지 선택할 수 있습니다.`,
    );
  };

  const handleToggleImage = (image: SharingResultImage) => {
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
      showSelectionLimitAlert();
      return;
    }

    setSelectedImageIds((previousIds) =>
      new Set(previousIds).add(image.id),
    );
  };

  const handleToggleAll = () => {
    if (isSaving) return;

    if (isAllSelectableSelected) {
      setSelectedImageIds(new Set());
      return;
    }

    setSelectedImageIds(
      new Set(selectableImages.map(({ id }) => id)),
    );
  };

  const requestWritePermission = async (): Promise<boolean> => {
    if (permissionResponse?.granted) return true;

    try {
      const result = await requestPermission();
      if (result.granted) return true;
    } catch {
      // 아래 공통 권한 안내를 표시합니다.
    }

    Alert.alert(
      "사진 권한 필요",
      "선택한 사진을 저장하려면 사진 보관함 추가 권한이 필요합니다.",
    );
    return false;
  };

  const handleSaveSelectedImages = async () => {
    if (selectedImages.length === 0 || isSaving) return;
    if (!(await requestWritePermission())) return;

    setIsSaving(true);

    const failedImageIds: string[] = [];
    let savedCount = 0;

    try {
      for (const [index, image] of selectedImages.entries()) {
        try {
          await saveImageToMediaLibrary(image, index);
          savedCount += 1;
        } catch {
          failedImageIds.push(image.id);
        }
      }

      setSelectedImageIds(new Set(failedImageIds));

      if (failedImageIds.length === 0) {
        Alert.alert(
          "사진 저장 완료",
          `${savedCount}장의 사진을 사진 보관함에 저장했습니다.`,
        );
        return;
      }

      if (savedCount > 0) {
        Alert.alert(
          "일부 사진 저장 실패",
          `${savedCount}장은 저장했고, ${failedImageIds.length}장은 저장하지 못했습니다. 실패한 사진을 다시 시도해주세요.`,
        );
        return;
      }

      Alert.alert(
        "사진 저장 실패",
        "선택한 사진을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
      <VStack className="flex-1 bg-white">
        <VStack className="gap-2 border-b border-outline-light px-6 py-4">
          <HStack className="items-center justify-between">
            <Text size="xl" bold>
              공유 사진
            </Text>
            <Pressable
              disabled={
                images.length === 0 || isSaving || isPending
              }
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
            disabled={
              selectedImages.length === 0 ||
              isSaving ||
              isPending
            }
            onPress={handleSaveSelectedImages}
            accessibilityLabel={`${selectedImages.length}장의 선택한 사진 저장`}
          >
            {isSaving && <ButtonSpinner color="#ffffff" />}
            <ButtonText>
              {isSaving
                ? "저장 중..."
                : `선택한 사진 저장 (${selectedImages.length})`}
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
