import {
  type RtcCreateRoomRequest,
  RtcCreateRoomRequestSchema,
  type RtcCreateRoomResponse,
  type RtcEndRoomMutationRequest,
  RtcEndRoomRequestSchema,
  RtcEndRoomResponseSchema,
  rtcRoomQueryKeys,
  type RtcRoomResponse,
  RtcRoomResponseSchema,
  verifyRtcId,
} from "@entities/rtc-room";
import {
  assertRtcAppAccessToken,
  createRtcHostHeaders,
  type RtcHostLiveKitTokenRequest,
  type RtcHostLiveKitTokenResponse,
  useRtcStore,
} from "@entities/rtc-session";
import { privateApiClient, uploadFetchClient } from "@shared/api";
import { ObjectToFormData } from "@shared/lib";
import { useAuthStore } from "@shared/model";
import { useMutation, useQuery } from "@tanstack/react-query";

export interface RtcRoomQueryOptions {
  enabled?: boolean;
  refetchInterval?: number | false;
}

export function useCreateRtcRoom() {
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
}

export function useReadRtcRoom(
  roomId: string,
  options: RtcRoomQueryOptions = {},
) {
  const normalizedRoomId = roomId.trim();
  const appAccessToken = useAuthStore((state) => state.accessToken);
  const hostAccessToken = useRtcStore((state) =>
    state.hostSession?.roomId === normalizedRoomId
      ? state.hostSession.hostAccessToken
      : null,
  );

  return useQuery({
    queryKey: rtcRoomQueryKeys.hostRoom(normalizedRoomId),
    queryFn: async () => {
      const id = verifyRtcId(normalizedRoomId, "RTC 방 ID");
      const response = await privateApiClient.get<RtcRoomResponse>(
        `/rtc/rooms/${id}`,
        { headers: createRtcHostHeaders(id) },
      );
      return RtcRoomResponseSchema.parse(response.data);
    },
    enabled:
      Boolean(normalizedRoomId && appAccessToken && hostAccessToken) &&
      (options.enabled ?? true),
    refetchInterval: options.refetchInterval ?? 2_000,
  });
}

export function useCreateHostLiveKitToken() {
  return useMutation({
    mutationFn: async ({ roomId }: RtcHostLiveKitTokenRequest) => {
      const id = verifyRtcId(roomId, "RTC 방 ID");
      const response = await privateApiClient.post<RtcHostLiveKitTokenResponse>(
        `/rtc/rooms/${id}/livekit-token`,
        undefined,
        { headers: createRtcHostHeaders(id) },
      );
      return response.data;
    },
    onSuccess: (response, { roomId }) => {
      if (useRtcStore.getState().hostSession?.roomId !== roomId.trim()) return;
      useRtcStore.getState().setLiveKitConnection({
        role: "HOST",
        url: response.url,
        token: response.token,
        expiresAt: response.expiresAt,
      });
    },
  });
}

export function useEndRtcRoom() {
  return useMutation({
    mutationFn: async ({ roomId, request = {} }: RtcEndRoomMutationRequest) => {
      const id = verifyRtcId(roomId, "RTC 방 ID");
      const headers = createRtcHostHeaders(id);
      const parsedRequest = RtcEndRoomRequestSchema.parse(request);
      const url = `/rtc/rooms/${id}/end`;
      const response = parsedRequest.images?.length
        ? await uploadFetchClient.patch({
            url,
            formData: ObjectToFormData(parsedRequest),
            headers,
          })
        : await privateApiClient.patch(url, undefined, { headers });
      return RtcEndRoomResponseSchema.parse(response.data);
    },
  });
}
