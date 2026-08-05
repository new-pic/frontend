export const RTC_REACTION_SOCKET_CONFIG = {
  namespace: "/rtc",
  path: "/socket.io/",
  hostJoinEvent: "rtc:host:join",
  viewerJoinEvent: "rtc:viewer:join",
  sendEvent: "rtc:feedback:send",
  receivedEvent: "rtc:feedback:received",
  minimumSendIntervalMs: 300,
  connectionTimeoutMs: 10_000,
  joinAckTimeoutMs: 5_000,
  joinRetryBaseDelayMs: 1_000,
  joinRetryMaxDelayMs: 15_000,
} as const;

export const RTC_REACTION_BUBBLE_CONFIG = {
  maxVisibleCount: 10,
  durationMs: 2_400,
  laneCount: 3,
  riseDistance: 170,
} as const;

export const RTC_REACTION_EMOJI_CONFIG = {
  animationDurationMs: 480,
  bubbleRiseDistance: 18,

  buttonPeakScale: 1.2,
  buttonSettleScale: 0.9,
  ringPeakScale: 1.2,

  blockedShakeDistance: 4,
  blockedShakeDurationMs: 100,
} as const;
