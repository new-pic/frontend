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

const finalizationCopy = {
  ENDING_ROOM: {
    title: "촬영 사진을 저장하고 있어요",
    description: "저장이 끝나면 촬영 결과를 바로 보여드릴게요.",
  },
  DELIVERING_RESULT: {
    title: "촬영 결과를 전달하고 있어요",
    description: "참여자에게 사진을 전달하는 동안 잠시만 기다려주세요.",
  },
} as const;

export function RtcFinalizationOverlay({ state }: RtcFinalizationOverlayProps) {
  if (!isRtcFinalizationBlocking(state)) return null;

  const copy = finalizationCopy[state];

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
              accessibilityLabel="RTC 방 종료 처리 중"
            />
            <VStack className="items-center gap-2">
              <Text size="xl" className="text-center font-semibold">
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
