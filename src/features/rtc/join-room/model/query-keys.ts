import {
  rtcStoredPhotoQueryKeys,
  type RtcStoredPhotoListParams,
} from "@entities/rtc-stored-photo";

export const rtcViewerQueryKeys = {
  roomStoredPhotoList: (roomId: string, params: RtcStoredPhotoListParams) =>
    [...rtcStoredPhotoQueryKeys.roomLists(roomId), params] as const,
} as const;
