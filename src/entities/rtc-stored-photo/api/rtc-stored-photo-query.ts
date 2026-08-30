import { privateApiClient } from "@shared/api";
import { useAuthStore } from "@shared/model";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  RTC_STORED_PHOTO_MAX_TAKE,
  RtcStoredPhotoListParamsSchema,
  RtcStoredPhotoListResponseSchema,
} from "../model/schema";
import type {
  RtcStoredPhotoListParams,
  RtcStoredPhotoListResponse,
} from "../model/models";
import { rtcStoredPhotoQueryKeys } from "../model/query-keys";

export function useReadMyRtcStoredPhotos(
  params: RtcStoredPhotoListParams = {},
) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const userId = useAuthStore((state) => state.userId);
  const normalizedParams = RtcStoredPhotoListParamsSchema.parse({
    take: params.take ?? RTC_STORED_PHOTO_MAX_TAKE,
    cursor: params.cursor,
  });

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
        params: { ...normalizedParams, cursor: pageParam },
        signal,
      });
      return RtcStoredPhotoListResponseSchema.parse(response.data);
    },
    initialPageParam: normalizedParams.cursor,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(userId && accessToken),
    staleTime: 60_000,
  });
}
