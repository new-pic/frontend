import { colors } from "@shared/ui/theme";
import { Center, Spinner, Text, VStack } from "@shared/ui";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  isRtcFinalizationBlocking,
  type RtcHostFinalizationState,
} from "../model/rtc-host-control";

interface RtcFinalizationOverlayProps {
  state: RtcHostFinalizationState;
}

export function RtcFinalizationOverlay({ state }: RtcFinalizationOverlayProps) {
  const { t } = useAppTranslation();
  if (!isRtcFinalizationBlocking(state)) return null;

  const copy =
    state === "ENDING_ROOM"
      ? {
          title: t("rtc.host.savingPhotos"),
          description: t("rtc.host.savingPhotosDescription"),
        }
      : {
          title: t("rtc.host.deliveringResults"),
          description: t("rtc.host.deliveringResultsDescription"),
        };

  return (
    <View
      pointerEvents="auto"
      accessibilityViewIsModal
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 100,
        backgroundColor: "rgba(255, 255, 255, 0.94)",
      }}
    >
      <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1 }}>
        <Center className="flex-1 px-8">
          <VStack className="items-center gap-5">
            <Spinner
              size="large"
              color={colors.brand.primary}
              accessibilityLabel={t("rtc.host.finalizingAccessibility")}
            />
            <VStack className="items-center gap-2">
              <Text size="xl" className="text-center font-paperlogy-semibold">
                {copy.title}
              </Text>
              <Text className="text-center text-label-muted">
                {copy.description}
              </Text>
            </VStack>
          </VStack>
        </Center>
      </SafeAreaView>
    </View>
  );
}
import { useAppTranslation } from "@shared/lib";
