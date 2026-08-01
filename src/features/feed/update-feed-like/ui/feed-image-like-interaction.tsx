import { MOBILE_UI_METRICS } from "@shared/constants";
import { IconHeartFilled } from "@tabler/icons-react-native";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import type { FeedLikeToggleResult } from "../model/feed-like-interaction";

interface FeedImageLikeInteractionProps {
  children: ReactNode;
  enabled: boolean;
  onToggle: () => Promise<FeedLikeToggleResult | null>;
}

export function FeedImageLikeInteraction({
  children,
  enabled,
  onToggle,
}: FeedImageLikeInteractionProps) {
  const [feedback, setFeedback] = useState<FeedLikeToggleResult>("LIKED");
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.6);

  const showFeedback = useCallback(
    (result: FeedLikeToggleResult) => {
      setFeedback(result);
      cancelAnimation(opacity);
      cancelAnimation(scale);

      opacity.value = 1;
      scale.value = result === "LIKED" ? 0.6 : 1.12;
      scale.value =
        result === "LIKED"
          ? withSequence(
              withSpring(1.16, {
                damping: 12,
                stiffness: 320,
                mass: 0.45,
              }),
              withTiming(1, { duration: 90 }),
            )
          : withTiming(0.68, { duration: 190 });
      opacity.value = withDelay(160, withTiming(0, { duration: 120 }));
    },
    [opacity, scale],
  );

  const handleDoubleTap = useCallback(async () => {
    const result = await onToggle();
    if (result) showFeedback(result);
  }, [onToggle, showFeedback]);

  const doubleTapGesture = useMemo(
    () =>
      Gesture.Tap()
        .enabled(enabled)
        .numberOfTaps(2)
        .maxDuration(260)
        .onEnd((_event, success) => {
          if (success) runOnJS(handleDoubleTap)();
        }),
    [enabled, handleDoubleTap],
  );

  const feedbackStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={doubleTapGesture}>
      <View
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
        }}
      >
        {children}
        <Animated.View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              alignItems: "center",
              justifyContent: "center",
            },
            feedbackStyle,
          ]}
        >
          <IconHeartFilled
            color="white"
            fill="white"
            opacity={0.9}
            size={MOBILE_UI_METRICS.feedbackIconSize}
            strokeWidth={2.4}
          />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}
