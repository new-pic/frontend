import { useAppTranslation } from "@shared/lib";
import { Button, ButtonText, Center, Text, VStack } from "@shared/ui";
import { ActivityIndicator, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export interface RtcViewerWaitingProps {
  mode?: "WAITING_FOR_HOST" | "PREPARING_RESULT";
  hostNickname?: string;
  onCancel?: () => void;
  isCanceling?: boolean;
  isConnecting?: boolean;
  connectionError?: string | null;
  onRetry?: () => void;
}

export function RtcViewerWaiting({
  mode = "WAITING_FOR_HOST",
  hostNickname,
  onCancel,
  isCanceling = false,
  isConnecting = false,
  connectionError,
  onRetry,
}: RtcViewerWaitingProps) {
  const { t } = useAppTranslation();
  const displayHostNickname =
    hostNickname?.trim() || t("rtc.join.hostFallback");
  const isPreparingResult = mode === "PREPARING_RESULT";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
      <VStack className="flex-1 bg-white">
        <Center className="flex-1 px-8 pb-12">
          <VStack className="w-full items-center gap-12">
            <Image
              source={require("@assets/images/icon.png")}
              accessibilityLabel={t("rtc.join.appIconAccessibility")}
              className="h-40 w-40"
              resizeMode="contain"
            />

            <VStack className="items-center gap-5">
              <Text size="xl" bold className="text-center text-foreground">
                {isPreparingResult
                  ? t("rtc.join.preparingResults")
                  : t("rtc.join.hostWaiting", {
                      nickname: displayHostNickname,
                    })}
              </Text>
              {(isConnecting || isPreparingResult) && (
                <ActivityIndicator
                  size="small"
                  color="#ff7c82"
                  accessibilityLabel={
                    isPreparingResult
                      ? t("rtc.join.preparingResultsAccessibility")
                      : t("rtc.join.connectingAccessibility")
                  }
                />
              )}
              <Text size="lg" className="text-center text-outline">
                {isPreparingResult
                  ? t("rtc.join.loadingPhotos")
                  : connectionError
                    ? connectionError
                    : isConnecting
                      ? t("rtc.join.connecting")
                      : t("rtc.join.wait")}
              </Text>
            </VStack>

            {!isPreparingResult && onCancel ? (
              <VStack className="w-full max-w-72 gap-3">
                {connectionError && onRetry ? (
                  <Button
                    variant="gradient"
                    size="lg"
                    onPress={onRetry}
                    accessibilityLabel={t("rtc.join.retryAccessibility")}
                  >
                    <ButtonText>{t("common.actions.retry")}</ButtonText>
                  </Button>
                ) : null}
                <Button
                  variant="outline"
                  size="lg"
                  disabled={isCanceling}
                  isLoading={isCanceling}
                  onPress={onCancel}
                  accessibilityLabel={
                    isCanceling
                      ? t("rtc.join.leavingAccessibility")
                      : t("rtc.join.cancelWaitingAccessibility")
                  }
                >
                  <ButtonText>
                    {isCanceling ? t("rtc.join.leaving") : t("rtc.join.cancel")}
                  </ButtonText>
                </Button>
              </VStack>
            ) : null}
          </VStack>
        </Center>

        {/* <Box
          className="h-24 w-full bg-outline-light"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        /> */}
      </VStack>
    </SafeAreaView>
  );
}
