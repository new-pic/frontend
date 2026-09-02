import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
import { styled } from "nativewind";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { RTC_REACTION_BUBBLE_CONFIG } from "../config/rtc-reaction-config";
import {
  adaptRtcReactionEmojis,
  enqueueRtcReactionBubble,
} from "../lib/rtc-reaction-domain";
import type { RtcReactionBubble } from "../model/types";
import { useRtcReactionChannel } from "../model/use-rtc-reaction-channel";
import { rtcReactionQuery } from "../api";

const BUBBLE_SIZE = 52;
const BUBBLE_LANE_GAP = 5;
const StyledAnimatedView = styled(Animated.View);

interface RtcHostReactionBubblesProps {
  active: boolean;
  roomId: string;
}

interface ReactionBubbleProps {
  bubble: RtcReactionBubble;
  onExpired: (renderId: string) => void;
}

function ReactionBubble({ bubble, onExpired }: ReactionBubbleProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const scale = useSharedValue(0.72);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { scale: scale.value },
    ],
  }));

  useEffect(() => {
    opacity.value = withSequence(
      withTiming(1, { duration: 140 }),
      withDelay(
        RTC_REACTION_BUBBLE_CONFIG.durationMs - 640,
        withTiming(0, { duration: 500 }),
      ),
    );
    translateY.value = withTiming(-RTC_REACTION_BUBBLE_CONFIG.riseDistance, {
      duration: RTC_REACTION_BUBBLE_CONFIG.durationMs,
      easing: Easing.out(Easing.quad),
    });
    translateX.value = withRepeat(
      withTiming(bubble.lane % 2 === 0 ? 10 : -10, {
        duration: 360,
        easing: Easing.inOut(Easing.sin),
      }),
      6,
      true,
    );
    scale.value = withTiming(1, {
      duration: 220,
      easing: Easing.out(Easing.back(1.4)),
    });
  }, [bubble.lane, opacity, scale, translateX, translateY]);

  useEffect(() => {
    const timeout = setTimeout(
      () => onExpired(bubble.renderId),
      RTC_REACTION_BUBBLE_CONFIG.durationMs,
    );
    return () => clearTimeout(timeout);
  }, [bubble.renderId, onExpired]);

  return (
    <StyledAnimatedView
      className="absolute bottom-0 h-13 w-13 items-center justify-center rounded-full bg-white/[0.92] shadow-hard-2"
      style={[
        { right: bubble.lane * (BUBBLE_SIZE + BUBBLE_LANE_GAP) },
        animatedStyle,
      ]}
    >
      <Text className="text-[1.9375rem] leading-[2.4375rem]">
        {bubble.symbol}
      </Text>
    </StyledAnimatedView>
  );
}

export function RtcHostReactionBubbles({
  active,
  roomId,
}: RtcHostReactionBubblesProps) {
  const { data, isError: isEmojiError } =
    rtcReactionQuery.useReadFeedbackEmojis();
  const emojis = useMemo(() => adaptRtcReactionEmojis(data), [data]);
  const emojiById = useMemo(
    () => new Map(emojis.map((emoji) => [emoji.id, emoji])),
    [emojis],
  );
  const sequenceRef = useRef(0);
  const [bubbles, setBubbles] = useState<RtcReactionBubble[]>([]);

  const handleReaction = useCallback(
    ({ emojiId }: { emojiId: string }) => {
      const emoji = emojiById.get(emojiId);
      if (!emoji) {
        if (__DEV__) {
          console.warn("[RTC Reaction] unknown emoji ignored", {
            roomId,
            emojiId,
          });
        }
        return;
      }

      const sequence = sequenceRef.current++;
      const bubble: RtcReactionBubble = {
        renderId: `${roomId}:${sequence}`,
        emojiId,
        symbol: emoji.symbol,
        lane: sequence % RTC_REACTION_BUBBLE_CONFIG.laneCount,
      };
      setBubbles((current) => enqueueRtcReactionBubble(current, bubble));
      if (__DEV__) {
        console.info("[RTC Reaction] bubble enqueued", {
          roomId,
          emojiId,
          renderId: bubble.renderId,
          lane: bubble.lane,
        });
      }
    },
    [emojiById, roomId],
  );

  useRtcReactionChannel({
    active,
    roomId,
    role: "HOST",
    onReaction: handleReaction,
  });

  useEffect(() => {
    sequenceRef.current = 0;
    setBubbles([]);
  }, [active, roomId]);

  const handleExpired = useCallback((renderId: string) => {
    setBubbles((current) =>
      current.filter((bubble) => bubble.renderId !== renderId),
    );
  }, []);

  if (!active || isEmojiError) return null;

  return (
    <View
      pointerEvents="none"
      className="absolute bottom-5 right-[1.375rem] z-20 h-[14.375rem] w-[11.25rem]"
    >
      {bubbles.map((bubble) => (
        <ReactionBubble
          key={bubble.renderId}
          bubble={bubble}
          onExpired={handleExpired}
        />
      ))}
    </View>
  );
}
