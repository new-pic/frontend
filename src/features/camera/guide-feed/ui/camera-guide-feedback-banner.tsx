import { useAppTranslation } from "@shared/lib";
import { Text } from "@shared/ui";
import { useMemo } from "react";
import { View } from "react-native";
import { mapPoseFeedbackMessage } from "../lib/pose-feedback-message";
import { MAX_POSE_COUNT } from "../lib/pose-detection/pose-detection-config";
import type { PoseGuideFeedbackDescriptor } from "../model";

interface CameraGuideFeedbackBannerProps {
  feedback: PoseGuideFeedbackDescriptor | null;
  isPersonLimitNoticeVisible?: boolean;
}

export function CameraGuideFeedbackBanner({
  feedback,
  isPersonLimitNoticeVisible,
}: CameraGuideFeedbackBannerProps) {
  const { t } = useAppTranslation();
  const feedbackMessage = useMemo(
    () => mapPoseFeedbackMessage(feedback, t),
    [feedback, t],
  );
  const message = isPersonLimitNoticeVisible
    ? t("guide.personLimitNotice", { count: MAX_POSE_COUNT })
    : feedbackMessage;
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
        <Text className="text-center font-paperlogy-semibold text-sm text-white">
          {message}
        </Text>
      </View>
    </View>
  );
}
