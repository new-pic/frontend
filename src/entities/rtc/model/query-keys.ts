export const rtcQueryKeys = {
  all: ["rtc"] as const,
  hostRooms: () => [...rtcQueryKeys.all, "host", "room"] as const,
  hostRoom: (roomId: string) =>
    [...rtcQueryKeys.hostRooms(), roomId.trim()] as const,
} as const;
