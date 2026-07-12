import { FeedResponse } from "@entities/feed";
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
import { CaptionContent, ImageSelector } from "@widgets/feed/edit";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type EditStep = "IMAGE" | "CAPTION";

export function FeedEditPage() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  const isEditMode = !!id;
  const form = useSaveFeedForm({ mode: isEditMode ? "EDIT" : "CREATE" });

  const [selectedImage, setSelectedImage] = useState<FeedResponse | null>(null);
  const [step, setStep] = useState<EditStep>("IMAGE");

  const handleSelectImage = (image: FeedResponse) => {
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
    setStep("CAPTION");
  }, [isEditMode]);

  return (
    <SafeAreaView>
      <KeyboardDismissLayout>
        <VStack className="h-full pt-3 w-full" space="xl">
          <HStack className="py-3 px-6 items-center justify-between border-b border-outline-light">
            <Button variant="ghost" size="icon" onPress={handleGoBack}>
              <ButtonIcon as={IconChevronLeft} />
            </Button>
            <Text className="font-semibold" size="lg">
              피드 작성하기
            </Text>
            <Box className="w-10" />
          </HStack>
          <Center>
            <Image
              source={{
                uri: selectedImage?.imageUrl,
              }}
              style={{ width: "60%", borderRadius: 20, aspectRatio: 4 / 5 }}
            />
          </Center>
          <VStack className="flex-1">
            {step === "IMAGE" ? (
              <ImageSelector
                selectedImages={selectedImage ? [selectedImage] : []}
                onSelectImage={handleSelectImage}
              />
            ) : (
              <CaptionContent form={form} />
            )}
            <HStack className="px-8 py-4 pt-8 border-t border-outline-light">
              {step === "IMAGE" ? (
                <Button
                  className="flex-1 h-12.5 p-0 rounded-xl"
                  variant="gradient"
                >
                  <ButtonText
                    size="lg"
                    className="font-semibold"
                    onPress={handlePressButton}
                  >
                    선택하기
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
