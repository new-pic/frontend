import { privateApiClient } from "@shared/api";
import { ObjectToFormData } from "@shared/lib";
import { useAuthStore } from "@shared/model";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  assertRtcAppAccessToken,
  createRtcHostHeaders,
  verifyRtcId,
} from "../lib";
import {
  API_QUERY_KEY,
  RtcCreateRoomRequest,
  RtcCreateRoomRequestSchema,
  RtcCreateRoomResponse,
  RtcEndRoomMutationRequest,
  RtcEndRoomRequestSchema,
  RtcEndRoomResponseSchema,
  RtcHostLiveKitTokenRequest,
  RtcHostLiveKitTokenResponse,
  RtcRoomResponse,
  RtcRoomResponseSchema,
  useRtcStore,
} from "../model";

const QUERY_KEY = [API_QUERY_KEY, "host"] as const;

export const rtcHostRoomQueryKey = (roomId: string) =>
  [...QUERY_KEY, "room", roomId.trim()] as const;

export interface RtcRoomQueryOptions {
  enabled?: boolean;
  refetchInterval?: number | false;
}

/**
 * RTC 방 생성
 *
 * 방 생성 전에는 host access token이 아직 없으므로 앱 access token만
 * 사용합니다. 생성 이후의 모든 HOST 요청은 createRtcHostHeaders()를 통해
 * 두 인증 정보를 함께 전송합니다.
 */
export const useCreateRtcRoom = () => {
  return useMutation({
    mutationFn: async (request: RtcCreateRoomRequest = {}) => {
      assertRtcAppAccessToken();
      const parsedRequest = RtcCreateRoomRequestSchema.parse(request);
      const response = await privateApiClient.post<RtcCreateRoomResponse>(
        "/rtc/rooms",
        parsedRequest,
      );
      return response.data;
    },
    onSuccess: (response) => {
      useRtcStore.getState().setHostSession({
        roomId: response.roomId,
        joinCode: response.joinCode,
        hostAccessToken: response.rtcHostAccessToken,
        expiresAt: response.expiresAt,
      });
    },
  });
};

/**
 * RTC 방 상세 조회 (촬영자만 가능)
 *
 * 참여자 수가 공유 대기 화면에 즉시 반영되도록 기본 2초 polling을
 * 사용합니다. 필요하면 options.refetchInterval로 덮어쓸 수 있습니다.
 */
export const useReadRtcRoom = (
  roomId: string,
  options: RtcRoomQueryOptions = {},
) => {
  const normalizedRoomId = roomId.trim();
  const appAccessToken = useAuthStore((state) => state.accessToken);
  const hostAccessToken = useRtcStore((state) =>
    state.hostSession?.roomId === normalizedRoomId
      ? state.hostSession.hostAccessToken
      : null,
  );

  return useQuery({
    queryKey: rtcHostRoomQueryKey(normalizedRoomId),
    queryFn: async () => {
      const id = verifyRtcId(normalizedRoomId, "RTC 방 ID");
      const response = await privateApiClient.get<RtcRoomResponse>(
        `/rtc/rooms/${id}`,
        {
          headers: createRtcHostHeaders(id),
        },
      );
      return RtcRoomResponseSchema.parse(response.data);
    },
    enabled:
      Boolean(normalizedRoomId && appAccessToken && hostAccessToken) &&
      (options.enabled ?? true),
    refetchInterval: options.refetchInterval ?? 2_000,
  });
};

/**
 * 촬영자용 LiveKit 연결 정보 발급
 */
export const useCreateHostLiveKitToken = () => {
  return useMutation({
    mutationFn: async ({ roomId }: RtcHostLiveKitTokenRequest) => {
      const id = verifyRtcId(roomId, "RTC 방 ID");
      const response = await privateApiClient.post<RtcHostLiveKitTokenResponse>(
        `/rtc/rooms/${id}/livekit-token`,
        undefined,
        {
          headers: createRtcHostHeaders(id),
        },
      );
      return response.data;
    },
    onSuccess: (response, { roomId }) => {
      if (useRtcStore.getState().hostSession?.roomId !== roomId.trim()) {
        return;
      }

      useRtcStore.getState().setLiveKitConnection({
        role: "HOST",
        url: response.url,
        token: response.token,
        expiresAt: response.expiresAt,
      });
    },
  });
};

/**
 * RTC 방 종료 (촬영자만 가능)
 */
export const useEndRtcRoom = () => {
  return useMutation({
    mutationFn: async ({ roomId, request = {} }: RtcEndRoomMutationRequest) => {
      const id = verifyRtcId(roomId, "RTC 방 ID");
      assertRtcAppAccessToken();
      const parsedRequest = RtcEndRoomRequestSchema.parse(request);
      const body = parsedRequest.images?.length
        ? ObjectToFormData(parsedRequest)
        : undefined;

      const response = await privateApiClient.patch(
        `/rtc/rooms/${id}/end`,
        body,
      );
      return RtcEndRoomResponseSchema.parse(response.data);
    },
  });
};
