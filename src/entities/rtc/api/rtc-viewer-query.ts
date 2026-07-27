import { privateApiClient } from "@shared/api";
import { useMutation } from "@tanstack/react-query";
import { assertRtcAppAccessToken, verifyRtcId } from "../lib";
import {
  RtcJoinRoomRequest,
  RtcJoinRoomRequestSchema,
  RtcJoinRoomResponse,
  RtcViewerLiveKitTokenRequest,
  RtcViewerLiveKitTokenResponse,
  useRtcStore,
} from "../model";

/**
 * QR 또는 6자리 코드로 RTC 방 참여
 */
export const useJoinRtcRoom = () => {
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
};

/**
 * 참여자용 LiveKit 연결 정보 발급
 */
export const useCreateViewerLiveKitToken = () => {
  return useMutation({
    mutationFn: async ({ roomId }: RtcViewerLiveKitTokenRequest) => {
      assertRtcAppAccessToken();
      const id = verifyRtcId(roomId, "RTC 방 ID");

      const response =
        await privateApiClient.post<RtcViewerLiveKitTokenResponse>(
          `/rtc/rooms/${id}/livekit-token`,
        );
      return response.data;
    },
    onSuccess: (response, { roomId }) => {
      if (useRtcStore.getState().viewerSession?.roomId !== roomId.trim()) {
        return;
      }

      useRtcStore.getState().setLiveKitConnection({
        role: "VIEWER",
        url: response.url,
        token: response.token,
      });
    },
  });
};
