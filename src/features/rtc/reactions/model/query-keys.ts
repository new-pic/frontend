import { rtcQueryKeys } from "@entities/rtc";

export const rtcReactionQueryKeys = {
  feedbackEmojis: () => [...rtcQueryKeys.all, "global", "emojis"] as const,
} as const;
