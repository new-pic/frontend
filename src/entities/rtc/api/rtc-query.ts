import { apiClient, privateApiClient, uploadFetchClient } from "@shared/api";
import { getAndCreateDeviceUUID, ObjectToFormData } from "@shared/lib";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  API_QUERY_KEY,
  RtcEndRoomRequest,
  RtcEndRoomRequestSchema,
  RtcJoinRoomRequest,
  useRtcStore,
} from "../model";

const QUERY_KEY = [API_QUERY_KEY, "rtc"];

/**
 * RTC 방 생성 (비회원도 가능)
 */

export const useCreateRtcRoom = () => {
  return useMutation({
    mutationFn: async () => {
      const response = await privateApiClient.post("/rtc/rooms");
      return response.data;
    },
  });
};

/**
 * RTC 방 상세 조회 (호스트만 가능)
 * @param roomId RTC 방 ID
 */
export const useReadRtcRoom = (roomId: string) => {
  const rtcToken = useRtcStore((state) => state.hostAccessToken);
  return useQuery({
    queryKey: [...QUERY_KEY, "room", roomId],
    queryFn: async () => {
      const response = await privateApiClient.get(`/rtc/rooms/${roomId}`, {
        headers: {
          "x-rtc-host-access-token": rtcToken,
        },
      });
      return response.data;
    },
    enabled: !!roomId && !!rtcToken,
    staleTime: 1000 * 60 * 5, // 5분
  });
};

/**
 *  RTC 방 참여 (QR 또는 6자리 코드로 참여)
 */
export const useJoinRtcRoom = () => {
  return useMutation({
    mutationFn: async ({
      code,
      displayName,
      isGuest = false,
    }: RtcJoinRoomRequest) => {
      const deviceUUID = isGuest ? await getAndCreateDeviceUUID() : undefined;
      const response = await privateApiClient.post(
        `/rtc/rooms/code/${code}/join`,
        {
          displayName,
          deviceUUID,
        },
      );
      return response.data;
    },
  });
};

/**
 * RTC 참여자 목록 조회 (호스트만 가능)
 */
export const useReadRtcParticipants = (roomId: string) => {
  const rtcToken = useRtcStore((state) => state.hostAccessToken);
  return useQuery({
    queryKey: [...QUERY_KEY, "participants", roomId],
    queryFn: async () => {
      const response = await privateApiClient.get(
        `/rtc/rooms/${roomId}/participants`,
        {
          headers: {
            "x-rtc-host-access-token": rtcToken,
          },
        },
      );
      return response.data;
    },
    enabled: !!roomId && !!rtcToken,
  });
};

/**
 *
 * 촬영자 LiveKit 토큰 발급
 */
export const useCreateHostLiveKitToken = (roomId: string) => {
  if (!roomId) return;
  return useMutation({
    mutationFn: async ({ isGuest }: { isGuest?: boolean }) => {
      const rtcToken = useRtcStore((state) => state.hostAccessToken);
      const headers: Record<string, string> = {};
      if (isGuest) {
        if (!rtcToken) return;
        headers["x-rtc-host-access-token"] = rtcToken;
      }
      const response = await apiClient.post(
        `/rtc/rooms/${roomId}/livekit-token`,
        {},
        {
          headers,
        },
      );
      return response.data;
    },
  });
};

/**
 * RTC 세션 유지 확인
 * @description RTC 방 참여 후, 일정 시간마다 서버에 세션 유지 요청 -> 세션 연장
 * @description (host만 가능)
 */
export const useKeepRtcSession = (roomId: string) => {
  if (!roomId) return;
  return useMutation({
    mutationFn: async () => {
      const rtcToken = useRtcStore.getState().hostAccessToken;
      if (!rtcToken) return;
      const response = await privateApiClient.post(
        `/rtc/rooms/${roomId}/keep-alive`,
        {},
        {
          headers: {
            "x-rtc-host-access-token": rtcToken,
          },
        },
      );
      return response.data;
    },
  });
};

/**
 *
 * 뷰어 LiveKit 토큰 발급
 */
export const useCreateViewerLiveKitToken = (roomId: string) => {
  if (!roomId) return;
  return useMutation({
    mutationFn: async ({ isGuest }: { isGuest?: boolean }) => {
      const response = await privateApiClient.post(
        `/rtc/rooms/${roomId}/livekit-token`,
      );
      return response.data;
    },
  });
};

/**
 * RTC 방 종료 (호스트만 가능)
 */
export const useEndRtcRoom = (roomId: string) => {
  if (!roomId) return;
  return useMutation({
    mutationFn: async (request: RtcEndRoomRequest = {}) => {
      const rtcToken = useRtcStore.getState().hostAccessToken;
      if (!rtcToken) return;

      const parsedRequest = RtcEndRoomRequestSchema.parse(request);
      const formData = ObjectToFormData(parsedRequest);

      const response = await uploadFetchClient.post({
        url: `/rtc/rooms/${roomId}/end`,
        formData,
        headers: {
          "x-rtc-host-access-token": rtcToken,
        },
      });
      return response.data;
    },
  });
};
