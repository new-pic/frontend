import { privateApiClient } from "@shared/api";
import { useAuthStore } from "@shared/model";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  RTC_STORED_PHOTO_MAX_TAKE,
  RtcRoomStoredPhotoListParams,
  RtcStoredPhotoListParams,
  RtcStoredPhotoListParamsSchema,
  RtcStoredPhotoListResponse,
  RtcStoredPhotoListResponseSchema,
  rtcStoredPhotoQueryKeys,
} from "../model";

export interface RtcStoredPhotoListQueryOptions {
  enabled?: boolean;
}

function normalizeListParams(params: RtcStoredPhotoListParams) {
  return RtcStoredPhotoListParamsSchema.parse({
    take: params.take ?? RTC_STORED_PHOTO_MAX_TAKE,
    cursor: params.cursor,
  });
}

export function useReadMyRtcStoredPhotos(
  params: RtcStoredPhotoListParams = {},
  options: RtcStoredPhotoListQueryOptions = {},
) {
  const normalizedParams = normalizeListParams(params);
  const appAccessToken = useAuthStore((state) => state.accessToken);
  const userId = useAuthStore((state) => state.userId);

  return useInfiniteQuery({
    queryKey: rtcStoredPhotoQueryKeys.myList(userId, normalizedParams),
    queryFn: async ({
      pageParam,
      signal,
    }): Promise<RtcStoredPhotoListResponse> => {
      if (!userId) {
        throw new Error("Cannot fetch stored photos without a user session");
      }
      const response = await privateApiClient.get("/users/me/photos", {
        params: {
          ...normalizedParams,
          cursor: pageParam,
        },
        signal,
      });
      return RtcStoredPhotoListResponseSchema.parse(response.data);
    },
    initialPageParam: normalizedParams.cursor,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(userId && appAccessToken) && (options.enabled ?? true),
    staleTime: 60_000,
  });
}

export function useReadRoomRtcStoredPhotos(
  { roomId, ...params }: RtcRoomStoredPhotoListParams,
  options: RtcStoredPhotoListQueryOptions = {},
) {
  const normalizedRoomId = roomId.trim();
  const normalizedParams = normalizeListParams(params);
  const appAccessToken = useAuthStore((state) => state.accessToken);

  return useInfiniteQuery({
    queryKey: rtcStoredPhotoQueryKeys.roomList(
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
          params: {
            ...normalizedParams,
            cursor: pageParam,
          },
          signal,
        },
      );
      return RtcStoredPhotoListResponseSchema.parse(response.data);
    },
    initialPageParam: normalizedParams.cursor,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled:
      Boolean(normalizedRoomId && appAccessToken) && (options.enabled ?? true),
    staleTime: 60_000,
  });
}
