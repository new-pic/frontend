import { feedQuery } from "@entities/feed";
import { SaveFeedButton, useSaveFeedForm } from "@features/feed/save-feed";
import {
  Box,
  Button,
  ButtonIcon,
  ButtonText,
  Center,
  HStack,
  KeyboardDismissLayout,
  Text,
  VStack,
} from "@shared/ui";
import { IconChevronLeft } from "@tabler/icons-react-native";
import {
  CaptionContent,
  FeedEditSkeleton,
  ImageSelector,
  type ImageParams,
} from "@widgets/feed/edit";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type EditStep = "IMAGE" | "CAPTION";

interface FeedEditPageProps {
  id?: string;
  isEditMode?: boolean;
}

export function FeedEditPage({ id, isEditMode }: FeedEditPageProps) {
  const { data, isError, isPending, refetch } = feedQuery.useReadFeed({
    feedId: id,
  });
  const form = useSaveFeedForm({
    mode: isEditMode ? "EDIT" : "CREATE",
  });
  const { reset } = form;

  const [selectedImage, setSelectedImage] = useState<ImageParams | null>(null);
  const [step, setStep] = useState<EditStep>("IMAGE");
  const [isLoadingAlbum, setIsLoadingAlbum] = useState(false);
  const initializedFeedIdRef = useRef<string | null>(null);

  const handleSelectImage = (image: ImageParams) => {
    setSelectedImage(image);
    form.setValue("image", image.imageUrl);
    form.setValue("imageFileName", image.fileName);
  };

  const handleGoBack = () => {
    if (!isEditMode && step === "CAPTION") {
      setStep("IMAGE");
      return;
    }
    router.back();
  };

  const handleNextStep = () => {
    setStep("CAPTION");
  };

  const handlePressButton = () => {
    if (step === "IMAGE") {
      handleNextStep();
    } else {
      router.push("/feed");
    }
  };

  useEffect(() => {
    if (isEditMode) {
      setStep("CAPTION");
      return;
    }
    initializedFeedIdRef.current = null;
    reset();
    setStep("IMAGE");
  }, [isEditMode, reset]);

  useEffect(() => {
    if (!isEditMode || !data || initializedFeedIdRef.current === data.id) {
      return;
    }

    reset({
      image: "",
      imageFileName: undefined,
      tags: data.tags,
      description: data.description,
    });
    initializedFeedIdRef.current = data.id;
  }, [data, isEditMode, reset]);

  if (isEditMode && isPending) return <FeedEditSkeleton />;

  if (isEditMode && (isError || !data)) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <Center className="flex-1 gap-4 px-6">
          <Text className="text-center text-label-muted">
            피드 수정 정보를 불러오지 못했습니다.
          </Text>
          <Button variant="outline" onPress={() => void refetch()}>
            <ButtonText>다시 시도</ButtonText>
          </Button>
        </Center>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView>
      <KeyboardDismissLayout>
        <VStack className="h-full pt-3 w-full" space="xl">
          <HStack className="py-3 px-6 items-center justify-between border-b border-outline-light">
            <Button
              variant="ghost"
              size="icon"
              accessibilityLabel="피드 편집 닫기"
              onPress={handleGoBack}
            >
              <ButtonIcon as={IconChevronLeft} />
            </Button>
            <Text className="font-semibold" size="lg">
              {isEditMode ? "피드 수정하기" : "피드 작성하기"}
            </Text>
            <Box className="w-12" />
          </HStack>
          <Center>
            <Image
              source={{
                uri: selectedImage?.imageUrl ?? data?.detailImageUrl,
              }}
              style={{ width: "60%", borderRadius: 20, aspectRatio: 4 / 5 }}
            />
          </Center>
          <VStack className="flex-1">
            {step === "IMAGE" ? (
              <ImageSelector
                selectedImages={selectedImage ? [selectedImage] : []}
                onSelectImage={handleSelectImage}
                onLoadingAlbum={setIsLoadingAlbum}
              />
            ) : (
              <CaptionContent form={form} />
            )}
            <HStack className="px-8 py-4 pt-8 border-t border-outline-light">
              {step === "IMAGE" ? (
                <Button
                  className="flex-1 h-12.5 p-0 rounded-xl"
                  variant="gradient"
                  disabled={!selectedImage || isLoadingAlbum}
                  onPress={handlePressButton}
                >
                  <ButtonText size="lg" className="font-semibold">
                    {isLoadingAlbum ? "불러오는 중..." : "선택하기"}
                  </ButtonText>
                </Button>
              ) : (
                <SaveFeedButton
                  form={form}
                  mode={isEditMode ? "EDIT" : "CREATE"}
                  feedId={isEditMode ? id : undefined}
                />
              )}
            </HStack>
          </VStack>
        </VStack>
      </KeyboardDismissLayout>
    </SafeAreaView>
  );
}
