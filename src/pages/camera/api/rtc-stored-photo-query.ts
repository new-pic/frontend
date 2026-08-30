import type {
  RtcRoomStoredPhotoListParams,
  RtcStoredPhotoListResponse,
} from "@entities/rtc-stored-photo";
import {
  RTC_STORED_PHOTO_MAX_TAKE,
  RtcStoredPhotoListParamsSchema,
  RtcStoredPhotoListResponseSchema,
} from "@entities/rtc-stored-photo";
import { privateApiClient } from "@shared/api";
import { useAuthStore } from "@shared/model";
import { useInfiniteQuery } from "@tanstack/react-query";
import { cameraPageQueryKeys } from "../model/query-keys";

export function useReadRoomRtcStoredPhotos({
  roomId,
  ...params
}: RtcRoomStoredPhotoListParams) {
  const normalizedRoomId = roomId.trim();
  const normalizedParams = RtcStoredPhotoListParamsSchema.parse({
    take: params.take ?? RTC_STORED_PHOTO_MAX_TAKE,
    cursor: params.cursor,
  });
  const accessToken = useAuthStore((state) => state.accessToken);

  return useInfiniteQuery({
    queryKey: cameraPageQueryKeys.roomStoredPhotoList(
      normalizedRoomId,
      normalizedParams,
    ),
    queryFn: async ({
      pageParam,
      signal,
    }): Promise<RtcStoredPhotoListResponse> => {
      const response = await privateApiClient.get(
        `/rtc/rooms/${encodeURIComponent(normalizedRoomId)}/photos`,
        {
          params: { ...normalizedParams, cursor: pageParam },
          signal,
        },
      );
      return RtcStoredPhotoListResponseSchema.parse(response.data);
    },
    initialPageParam: normalizedParams.cursor,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(normalizedRoomId && accessToken),
    staleTime: 60_000,
  });
}
