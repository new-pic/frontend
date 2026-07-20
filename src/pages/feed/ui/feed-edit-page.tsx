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
  ImageSelector,
  type ImageParams,
} from "@widgets/feed/edit";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type EditStep = "IMAGE" | "CAPTION";

interface FeedEditPageProps {
  id?: string;
  isEditMode?: boolean;
}

export function FeedEditPage({ id, isEditMode }: FeedEditPageProps) {
  const { data } = feedQuery.useReadFeed({ feedId: id });
  const form = useSaveFeedForm({
    mode: isEditMode ? "EDIT" : "CREATE",
  });

  const [selectedImage, setSelectedImage] = useState<ImageParams | null>(null);
  const [step, setStep] = useState<EditStep>("IMAGE");
  const [isLoadingAlbum, setIsLoadingAlbum] = useState(false);

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
    form.reset();
    if (isEditMode) {
      setStep("CAPTION");
      return;
    }
    setStep("IMAGE");
  }, [isEditMode]);

  useEffect(() => {
    if (data) {
      form.setValue("tags", data.tags);
      form.setValue("description", data.description);
    }
  }, [data]);

  console.log("selectedImage", selectedImage, data);

  return (
    <SafeAreaView>
      <KeyboardDismissLayout>
        <VStack className="h-full pt-3 w-full" space="xl">
          <HStack className="py-3 px-6 items-center justify-between border-b border-outline-light">
            <Button variant="ghost" size="icon" onPress={handleGoBack}>
              <ButtonIcon as={IconChevronLeft} />
            </Button>
            <Text className="font-semibold" size="lg">
              {isEditMode ? "피드 수정하기" : "피드 작성하기"}
            </Text>
            <Box className="w-10" />
          </HStack>
          <Center>
            <Image
              source={{
                uri: selectedImage?.imageUrl ?? data?.thumbnailUrl,
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
