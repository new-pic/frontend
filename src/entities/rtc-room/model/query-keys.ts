export const rtcRoomQueryKeys = {
  all: ["rtc-room"] as const,
  hostRooms: () => [...rtcRoomQueryKeys.all, "host"] as const,
  hostRoom: (roomId: string) =>
    [...rtcRoomQueryKeys.hostRooms(), roomId.trim()] as const,
} as const;
