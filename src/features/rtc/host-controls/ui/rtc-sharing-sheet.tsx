import { useAppTranslation } from "@shared/lib";
import {
  Box,
  Button,
  ButtonText,
  Center,
  HStack,
  Text,
  VStack,
} from "@shared/ui";
import { useWindowDimensions } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";

export interface RtcSharingSheetProps {
  joinCode: string;
  qrValue: string;
  participantCount: number;
  isStarting?: boolean;
  canStart?: boolean;
  onCancel: () => void;
  onStart: () => void;
}

export function RtcSharingSheet({
  joinCode,
  qrValue,
  participantCount,
  isStarting = false,
  canStart = true,
  onCancel,
  onStart,
}: RtcSharingSheetProps) {
  const { t } = useAppTranslation();
  const { width } = useWindowDimensions();
  const qrSize = Math.min(236, Math.max(176, width - 112));
  const safeParticipantCount = Math.max(0, participantCount);

  return (
    <Box className="absolute inset-0 z-30 justify-end bg-black/20">
      <SafeAreaView
        edges={["bottom"]}
        style={{
          height: "78%",
          backgroundColor: "white",
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
        }}
      >
        <VStack className="flex-1 px-8 pb-3">
          <Center className="pt-5">
            <Box className="h-1 w-24 rounded-full bg-outline-light" />
          </Center>

          <Center className="flex-1">
            <VStack className="items-center gap-7">
              <Text size="xl" bold className="text-center text-foreground">
                {t("rtc.host.sharingTitle")}
              </Text>

              <Box
                className="rounded-xl bg-white p-2"
                accessibilityLabel={t("rtc.host.qrAccessibility", {
                  code: joinCode,
                })}
              >
                <QRCode
                  value={qrValue}
                  size={qrSize}
                  backgroundColor="#ffffff"
                  color="#000000"
                />
              </Box>

              <Text size="lg" className="text-center text-foreground">
                {t("rtc.host.shareCode", { code: joinCode })}
              </Text>
            </VStack>
          </Center>

          <VStack className="gap-7">
            <HStack className="items-center justify-between px-4">
              <Text size="lg" className="text-foreground">
                {t("rtc.host.qrReaders")}
              </Text>

              <Text size="lg" bold className="min-w-10 text-right">
                {t("rtc.host.participantCount", {
                  count: safeParticipantCount,
                })}
              </Text>
            </HStack>

            <HStack className="gap-4">
              <Button
                variant="outline"
                size="lg"
                className="flex-1"
                disabled={isStarting}
                onPress={onCancel}
                accessibilityLabel={t("rtc.host.cancelAccessibility")}
              >
                <ButtonText>{t("rtc.host.cancel")}</ButtonText>
              </Button>
              <Button
                variant="gradient"
                size="lg"
                className="flex-1"
                disabled={isStarting || !canStart}
                isLoading={isStarting}
                onPress={onStart}
                accessibilityLabel={t("rtc.host.startAccessibility")}
              >
                <ButtonText>
                  {canStart
                    ? t("rtc.host.share")
                    : t("rtc.host.cameraPreparing")}
                </ButtonText>
              </Button>
            </HStack>
          </VStack>
        </VStack>
      </SafeAreaView>
    </Box>
  );
}
