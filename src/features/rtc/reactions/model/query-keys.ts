export const rtcReactionQueryKeys = {
  all: ["rtc-reactions"] as const,
  feedbackEmojis: () => [...rtcReactionQueryKeys.all, "emojis"] as const,
} as const;
