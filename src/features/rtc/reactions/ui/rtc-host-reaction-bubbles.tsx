import { rtcQuery } from "@entities/rtc";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
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

const BUBBLE_SIZE = 52;
const BUBBLE_LANE_GAP = 5;

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
    <Animated.View
      style={[
        styles.bubble,
        {
          right: bubble.lane * (BUBBLE_SIZE + BUBBLE_LANE_GAP),
        },
        animatedStyle,
      ]}
    >
      <Text style={styles.bubbleEmoji}>{bubble.symbol}</Text>
    </Animated.View>
  );
}

export function RtcHostReactionBubbles({
  active,
  roomId,
}: RtcHostReactionBubblesProps) {
  const emojiQuery = rtcQuery.useReadFeedbackEmojis();
  const emojis = useMemo(
    () => adaptRtcReactionEmojis(emojiQuery.data),
    [emojiQuery.data],
  );
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

  if (!active || emojiQuery.isError) return null;

  return (
    <View pointerEvents="none" style={styles.root}>
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

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    right: 22,
    bottom: 20,
    width: 180,
    height: 230,
    zIndex: 20,
  },
  bubble: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BUBBLE_SIZE / 2,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
    elevation: 5,
  },
  bubbleEmoji: {
    fontSize: 31,
    lineHeight: 39,
  },
});
