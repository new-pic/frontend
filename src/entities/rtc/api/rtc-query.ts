import { apiClient, privateApiClient } from "@shared/api";
import { useAuthStore } from "@shared/model";
import {
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";
import { verifyRtcId } from "../lib";
import {
  API_QUERY_KEY,
  RTC_MAX_PHOTO_LIST_TAKE,
  RtcFeedbackEmojiListResponse,
  RtcRoomPhotoListParams,
  RtcRoomPhotoListQuerySchema,
  RtcRoomPhotoListResponse,
  RtcRoomPhotoListResponseSchema,
} from "../model";

const QUERY_KEY = [API_QUERY_KEY, "global"] as const;

/**
 * RTC 피드백 이모지 목록 조회
 */
export const useReadFeedbackEmojis = () => {
  return useQuery({
    queryKey: [...QUERY_KEY, "emojis"],
    queryFn: async () => {
      const response =
        await apiClient.get<RtcFeedbackEmojiListResponse>("/rtc/emojis");
      return response.data;
    },
  });
};

export interface RtcRoomPhotoListQueryOptions {
  enabled?: boolean;
}

/**
 * RTC 촬영 결과 사진 목록 조회
 *
 * 방을 생성한 호스트와 실제 참여자만 조회할 수 있는 인증 API입니다.
 * 다음 페이지는 서버가 내려준 nextCursor를 그대로 전달합니다.
 */
export const useReadRtcRoomPhotos = (
  {
    roomId,
    take = RTC_MAX_PHOTO_LIST_TAKE,
    cursor,
  }: RtcRoomPhotoListParams,
  options: RtcRoomPhotoListQueryOptions = {},
) => {
  const normalizedRoomId = roomId.trim();
  const appAccessToken = useAuthStore((state) => state.accessToken);

  return useInfiniteQuery({
    queryKey: [
      ...QUERY_KEY,
      "room",
      normalizedRoomId,
      "photos",
      { take, cursor },
    ],
    queryFn: async ({ pageParam }): Promise<RtcRoomPhotoListResponse> => {
      const id = verifyRtcId(normalizedRoomId, "RTC 방 ID");
      const query = RtcRoomPhotoListQuerySchema.parse({
        take,
        cursor: pageParam,
      });
      const response = await privateApiClient.get(
        `/rtc/rooms/${id}/photos`,
        { params: query },
      );

      return RtcRoomPhotoListResponseSchema.parse(response.data);
    },
    initialPageParam: cursor,
    getNextPageParam: (lastPage) =>
      lastPage.nextCursor ?? undefined,
    enabled:
      Boolean(normalizedRoomId && appAccessToken) &&
      (options.enabled ?? true),
  });
};
