import {
  rtcStoredPhotoQueryKeys,
  type RtcStoredPhotoListParams,
} from "@entities/rtc-stored-photo";
import { userQueryKeys, type PaginationParams } from "@entities/user";

export const profilePageQueryKeys = {
  blockedUserList: (userId: string | null, params: PaginationParams) =>
    [...userQueryKeys.blockLists(), userId, params] as const,
  rtcStoredPhotoList: (
    userId: string | null,
    params: RtcStoredPhotoListParams,
  ) => [...rtcStoredPhotoQueryKeys.myLists(), userId, params] as const,
} as const;
