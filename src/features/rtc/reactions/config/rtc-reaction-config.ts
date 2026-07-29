export const RTC_REACTION_SOCKET_CONFIG = {
  namespace: "/rtc",
  path: "/socket.io/",
  sendEvent: "rtc:feedback:send",
  receivedEvent: "rtc:feedback:received",
  minimumSendIntervalMs: 300,
  connectionTimeoutMs: 10_000,
} as const;

export const RTC_REACTION_BUBBLE_CONFIG = {
  maxVisibleCount: 10,
  durationMs: 2_400,
  laneCount: 3,
  riseDistance: 170,
} as const;
