import * as Haptics from "expo-haptics";
import { useAppTranslation } from "@shared/lib";
import { useCallback } from "react";
import { AccessibilityInfo, Pressable, Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { RTC_REACTION_EMOJI_CONFIG } from "../config/rtc-reaction-config";
import type { RtcReactionEmoji } from "../model/types";

const StyledAnimatedView = Animated.createAnimatedComponent(View);

interface RtcViewerReactionButtonProps {
  emoji: RtcReactionEmoji;
  disabled: boolean;
  onSend: (emojiId: string) => boolean;
}

export function RtcViewerReactionButton({
  emoji,
  disabled,
  onSend,
}: RtcViewerReactionButtonProps) {
  const { t } = useAppTranslation();
  const successProgress = useSharedValue(0);
  const blockedTranslateX = useSharedValue(0);

  const playSuccessFeedback = useCallback(() => {
    cancelAnimation(successProgress);

    successProgress.value = 0;
    successProgress.value = withTiming(
      1,
      {
        duration: RTC_REACTION_EMOJI_CONFIG.animationDurationMs,
        easing: Easing.out(Easing.cubic),
      },
      (finished) => {
        if (finished) {
          successProgress.value = 0;
        }
      },
    );

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
      () => undefined,
    );

    AccessibilityInfo.announceForAccessibility(
      t("rtc.reaction.sent", { emoji: emoji.label }),
    );
  }, [emoji.label, successProgress, t]);

  const playBlockedFeedback = useCallback(() => {
    const { blockedShakeDistance, blockedShakeDurationMs } =
      RTC_REACTION_EMOJI_CONFIG;

    cancelAnimation(blockedTranslateX);
    blockedTranslateX.value = 0;

    blockedTranslateX.value = withSequence(
      withTiming(-blockedShakeDistance, {
        duration: blockedShakeDurationMs,
      }),
      withTiming(blockedShakeDistance, {
        duration: blockedShakeDurationMs,
      }),
      withTiming(-blockedShakeDistance * 0.75, {
        duration: blockedShakeDurationMs,
      }),
      withTiming(blockedShakeDistance * 0.75, {
        duration: blockedShakeDurationMs,
      }),
      withTiming(0, {
        duration: blockedShakeDurationMs,
      }),
    );
    AccessibilityInfo.announceForAccessibility(
      t("rtc.reaction.failed", { emoji: emoji.label }),
    );
  }, [emoji.label, blockedTranslateX, t]);
  const handlePress = useCallback(() => {
    const sent = onSend(emoji.id);

    if (!sent) {
      playBlockedFeedback();
      return;
    }

    playSuccessFeedback();
  }, [emoji.id, onSend, playBlockedFeedback, playSuccessFeedback]);

  const buttonFeedbackStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      successProgress.value,
      [0, 0.18, 0.45, 1],
      [
        1,
        RTC_REACTION_EMOJI_CONFIG.buttonPeakScale,
        RTC_REACTION_EMOJI_CONFIG.buttonSettleScale,
        1,
      ],
      Extrapolation.CLAMP,
    );

    return {
      transform: [
        {
          translateX: blockedTranslateX.value,
        },
        {
          scale,
        },
      ],
    };
  });

  const feedbackBubbleStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      successProgress.value,
      [0, 0.08, 0.7, 1],
      [0, 1, 1, 0],
      Extrapolation.CLAMP,
    );

    const translateY = interpolate(
      successProgress.value,
      [0, 1],
      [0, -RTC_REACTION_EMOJI_CONFIG.bubbleRiseDistance],
      Extrapolation.CLAMP,
    );

    const scale = interpolate(
      successProgress.value,
      [0, 0.25, 1],
      [0.7, 1, 1.12],
      Extrapolation.CLAMP,
    );

    return {
      opacity,
      transform: [{ translateY }, { scale }],
    };
  });

  const feedbackRingStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      successProgress.value,
      [0, 0.1, 0.6, 1],
      [0, 0.8, 0.35, 0],
      Extrapolation.CLAMP,
    );

    const scale = interpolate(
      successProgress.value,
      [0, 1],
      [0.82, RTC_REACTION_EMOJI_CONFIG.ringPeakScale],
      Extrapolation.CLAMP,
    );

    return {
      opacity,
      transform: [{ scale }],
    };
  });

  return (
    <View className="relative h-14 w-14">
      {/* 전송 성공 시 버튼 테두리에서 퍼지는 효과 */}
      <StyledAnimatedView
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        className="absolute inset-0 rounded-full border-2 border-brand"
        style={feedbackRingStyle}
      />

      {/* 전송 성공 시 위로 떠오르는 동일 이모지 */}
      <StyledAnimatedView
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        className="absolute left-0 right-0 top-[1.0625rem] z-[3] items-center"
        style={feedbackBubbleStyle}
      >
        <Text className="text-3xl leading-10">{emoji.symbol}</Text>
      </StyledAnimatedView>

      <Animated.View style={buttonFeedbackStyle}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("rtc.reaction.sendAccessibility", {
            emoji: emoji.label,
          })}
          accessibilityHint={
            disabled
              ? t("rtc.reaction.unavailableHint")
              : t("rtc.reaction.sendHint")
          }
          accessibilityState={{
            disabled,
          }}
          disabled={disabled}
          onPress={handlePress}
          className={`h-14 w-14 items-center justify-center rounded-full bg-background-muted ${
            disabled ? "opacity-40" : ""
          }`}
          style={({ pressed }) => ({
            transform: [
              {
                scale: pressed && !disabled ? 0.9 : 1,
              },
            ],
          })}
        >
          <Text className="text-3xl leading-10">{emoji.symbol}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}
