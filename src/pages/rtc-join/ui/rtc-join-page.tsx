import { RtcJoinForm } from "@features/rtc/join-room";
import { useAppTranslation } from "@shared/lib";
import { Button, ButtonIcon, HStack, VStack } from "@shared/ui";
import { IconChevronLeft } from "@tabler/icons-react-native";
import { Href, router, useLocalSearchParams } from "expo-router";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function RtcJoinPage() {
  const { t } = useAppTranslation();
  const { code: codeParam } = useLocalSearchParams<{
    code?: string | string[];
  }>();
  const initialCode = Array.isArray(codeParam) ? codeParam[0] : codeParam;

  const leaveJoinPage = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/feed" as Href);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <VStack className="flex-1 px-6 py-4">
            <HStack className="items-center">
              <Button
                variant="ghost"
                size="icon"
                onPress={leaveJoinPage}
                accessibilityLabel={t("common.accessibility.goBack")}
              >
                <ButtonIcon as={IconChevronLeft} />
              </Button>
            </HStack>

            <VStack className="flex-1 justify-center pb-20">
              <RtcJoinForm initialCode={initialCode} />
            </VStack>
          </VStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
