import {
  assertRtcAppAccessToken,
  isCurrentRtcViewerSession,
  type RtcJoinRoomRequest,
  RtcJoinRoomRequestSchema,
  type RtcJoinRoomResponse,
  type RtcLeaveRoomRequest,
  type RtcLeaveRoomResponse,
  type RtcViewerLiveKitTokenRequest,
  type RtcViewerLiveKitTokenResponse,
  useRtcStore,
  verifyRtcId,
} from "@entities/rtc";
import { privateApiClient } from "@shared/api";
import { useMutation } from "@tanstack/react-query";

export function useJoinRtcRoom() {
  return useMutation({
    mutationFn: async (request: RtcJoinRoomRequest) => {
      assertRtcAppAccessToken();
      const parsedRequest = RtcJoinRoomRequestSchema.parse(request);
      const response = await privateApiClient.post<RtcJoinRoomResponse>(
        `/rtc/rooms/code/${parsedRequest.code}/join`,
      );
      return response.data;
    },
    onSuccess: (response) => {
      useRtcStore.getState().setViewerSession({
        roomId: response.roomId,
        participantId: response.participantId,
      });
    },
  });
}

export function useCreateViewerLiveKitToken() {
  return useMutation({
    mutationFn: async ({ participantId }: RtcViewerLiveKitTokenRequest) => {
      assertRtcAppAccessToken();
      const id = verifyRtcId(participantId, "RTC 참여자 ID");
      const response =
        await privateApiClient.post<RtcViewerLiveKitTokenResponse>(
          `/rtc/participants/${id}/livekit-token`,
        );
      return response.data;
    },
    onSuccess: (response, request) => {
      if (
        !isCurrentRtcViewerSession(
          useRtcStore.getState().viewerSession,
          request,
        )
      ) {
        return;
      }
      useRtcStore.getState().setLiveKitConnection({
        role: "VIEWER",
        url: response.url,
        token: response.token,
      });
    },
  });
}

export function useLeaveRtcRoom() {
  return useMutation({
    mutationFn: async ({ participantId }: RtcLeaveRoomRequest) => {
      assertRtcAppAccessToken();
      const id = verifyRtcId(participantId, "RTC 참여자 ID");
      const response = await privateApiClient.patch<RtcLeaveRoomResponse>(
        `/rtc/participants/${id}/leave`,
        undefined,
      );
      return response.data;
    },
  });
}
