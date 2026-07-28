import { Text } from "@shared/ui";
import { useMemo } from "react";
import { View } from "react-native";
import { mapPoseFeedbackMessage } from "../lib/pose-feedback-message";
import type { PoseGuideFeedbackDescriptor } from "../model";

interface CameraGuideFeedbackBannerProps {
  feedback: PoseGuideFeedbackDescriptor | null;
}

export function CameraGuideFeedbackBanner({
  feedback,
}: CameraGuideFeedbackBannerProps) {
  const message = useMemo(
    () => mapPoseFeedbackMessage(feedback),
    [feedback],
  );
  if (!message) return null;

  return (
    <View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={{
        position: "absolute",
        top: 16,
        left: 24,
        right: 24,
        zIndex: 14,
        alignItems: "center",
      }}
    >
      <View
        style={{
          maxWidth: 320,
          borderRadius: 18,
          backgroundColor: "rgba(0,0,0,0.72)",
          paddingHorizontal: 18,
          paddingVertical: 10,
        }}
      >
        <Text className="text-center font-semibold text-sm text-white">
          {message}
        </Text>
      </View>
    </View>
  );
}

