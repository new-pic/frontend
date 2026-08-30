import type { RtcStoredPhotoListParams } from "./models";

export const rtcStoredPhotoQueryKeys = {
  all: ["rtc-stored-photo"] as const,
  myLists: () => [...rtcStoredPhotoQueryKeys.all, "me", "list"] as const,
  myList: (userId: string | null, params: RtcStoredPhotoListParams) =>
    [...rtcStoredPhotoQueryKeys.myLists(), userId, params] as const,
  roomLists: (roomId: string) =>
    [...rtcStoredPhotoQueryKeys.all, "room", roomId, "list"] as const,
} as const;
