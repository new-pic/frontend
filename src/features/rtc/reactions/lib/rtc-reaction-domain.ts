import type { RtcFeedbackEmojiListResponse } from "@entities/rtc";
import { RTC_REACTION_BUBBLE_CONFIG } from "../config/rtc-reaction-config";
import type {
  RtcReactionBubble,
  RtcReactionEmoji,
  RtcReceivedReaction,
} from "../model/types";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

export const adaptRtcReactionEmojis = (
  response: RtcFeedbackEmojiListResponse | undefined,
): RtcReactionEmoji[] => {
  if (!response || !Array.isArray(response.items)) return [];

  const uniqueIds = new Set<string>();
  const emojis: RtcReactionEmoji[] = [];

  for (const item of response.items) {
    if (
      !item ||
      !isNonEmptyString(item.id) ||
      !isNonEmptyString(item.label) ||
      !isNonEmptyString(item.symbol)
    ) {
      continue;
    }

    const id = item.id.trim();
    if (uniqueIds.has(id)) continue;

    uniqueIds.add(id);
    emojis.push({
      id,
      label: item.label.trim(),
      symbol: item.symbol.trim(),
    });
  }

  return emojis;
};

export const parseRtcReceivedReaction = (
  payload: unknown,
): RtcReceivedReaction | null => {
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("emojiId" in payload) ||
    !isNonEmptyString(payload.emojiId)
  ) {
    return null;
  }

  return { emojiId: payload.emojiId.trim() };
};

export const canSendRtcReaction = (
  lastSentAt: number | null,
  now: number,
  minimumIntervalMs: number,
): boolean => lastSentAt === null || now - lastSentAt >= minimumIntervalMs;

export const enqueueRtcReactionBubble = (
  current: readonly RtcReactionBubble[],
  next: RtcReactionBubble,
  maxVisibleCount = RTC_REACTION_BUBBLE_CONFIG.maxVisibleCount,
): RtcReactionBubble[] => {
  const safeMaximum = Math.max(1, Math.floor(maxVisibleCount));
  return [...current, next].slice(-safeMaximum);
};
