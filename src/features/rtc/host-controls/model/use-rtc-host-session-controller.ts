import type { RtcEndRoomResponse } from "@entities/rtc-room";
import { rtcStoredPhotoQuery } from "@entities/rtc-stored-photo";
import { type RtcLiveKitConnection, useRtcStore } from "@entities/rtc-session";
import { getApiErrorMessage } from "@shared/api";
import type { File } from "expo-file-system";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RtcHostFinalizationState } from "./rtc-host-control";
import {
  isRtcFinalizationBlocking,
  isRtcFinalizationPending,
  RTC_HOST_ROOM_EXPIRES_IN_MINUTES,
} from "./rtc-host-control";
import { useRtcRoomEvents } from "./use-rtc-room-events";
import { rtcHostQuery } from "../api";

interface SelectedHostPhoto {
  id: string;
  uri: string;
}

export interface RtcHostResultImage {
  id: string;
  imageUrl: string;
}

interface UseRtcHostSessionControllerOptions {
  isCameraFocused: boolean;
  isCameraRunning: boolean;
  prepareEndPhotos: () => Promise<void>;
  getPreparedEndImages: () => File[];
  getSelectedEndPhotos: () => SelectedHostPhoto[];
  onResultReady: (images: RtcHostResultImage[]) => void;
  onResultRefreshError: () => void;
}

type HostCommandResult =
  { ok: true } | { ok: false; title: string; message: string };

export function useRtcHostSessionController({
  isCameraFocused,
  isCameraRunning,
  prepareEndPhotos,
  getPreparedEndImages,
  getSelectedEndPhotos,
  onResultReady,
  onResultRefreshError,
}: UseRtcHostSessionControllerOptions) {
  const hostSession = useRtcStore((state) => state.hostSession);
  const clearHostSession = useRtcStore((state) => state.clearHostSession);
  const createRoomMutation = rtcHostQuery.useCreateRtcRoom();
  const createHostTokenMutation = rtcHostQuery.useCreateHostLiveKitToken();
  const endRoomMutation = rtcHostQuery.useEndRtcRoom();
  const resetMyRtcStoredPhotos =
    rtcStoredPhotoQuery.useResetMyRtcStoredPhotos();
  const [broadcastConnection, setBroadcastConnection] =
    useState<RtcLiveKitConnection | null>(null);
  const [endRequestId, setEndRequestId] = useState(0);
  const [finalizationState, setFinalizationState] =
    useState<RtcHostFinalizationState>("IDLE");
  const cameraFocusedRef = useRef(isCameraFocused);
  const cameraRunningRef = useRef(isCameraRunning);

  useEffect(() => {
    cameraFocusedRef.current = isCameraFocused;
    cameraRunningRef.current = isCameraRunning;
  }, [isCameraFocused, isCameraRunning]);

  const roomId = hostSession?.roomId ?? "";
  const { data: roomData } = rtcHostQuery.useReadRtcRoom(roomId, {
    enabled: Boolean(hostSession) && isCameraFocused,
    refetchInterval: false,
  });
  useRtcRoomEvents({
    roomId,
    enabled: Boolean(hostSession) && isCameraFocused,
  });

  const prepareSharing =
    useCallback(async (): Promise<HostCommandResult | null> => {
      if (createRoomMutation.isPending) return null;

      try {
        await createRoomMutation.mutateAsync({
          expiresInMinutes: RTC_HOST_ROOM_EXPIRES_IN_MINUTES,
        });
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          title: "RTC 방 생성 실패",
          message: getApiErrorMessage(error, "잠시 후 다시 시도해주세요."),
        };
      }
    }, [createRoomMutation]);

  const cancelPreparedSharing =
    useCallback(async (): Promise<HostCommandResult | null> => {
      if (!hostSession || endRoomMutation.isPending) return null;

      try {
        await endRoomMutation.mutateAsync({ roomId: hostSession.roomId });
        clearHostSession();
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          title: "RTC 방 종료 실패",
          message: getApiErrorMessage(error, "잠시 후 다시 시도해주세요."),
        };
      }
    }, [clearHostSession, endRoomMutation, hostSession]);

  const startBroadcast =
    useCallback(async (): Promise<HostCommandResult | null> => {
      if (
        !hostSession ||
        createHostTokenMutation.isPending ||
        broadcastConnection
      ) {
        return null;
      }

      if (!cameraFocusedRef.current || !cameraRunningRef.current) {
        return {
          ok: false,
          title: "카메라 준비 중",
          message: "카메라가 시작된 뒤 다시 공유해주세요.",
        };
      }

      try {
        const response = await createHostTokenMutation.mutateAsync({
          roomId: hostSession.roomId,
        });
        if (!cameraFocusedRef.current || !cameraRunningRef.current) {
          return {
            ok: false,
            title: "카메라 상태 변경",
            message: "카메라가 중지되어 LiveKit 송출을 시작하지 않았습니다.",
          };
        }

        setBroadcastConnection({ url: response.url, token: response.token });
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          title: "실시간 공유 시작 실패",
          message: getApiErrorMessage(error, "잠시 후 다시 시도해주세요."),
        };
      }
    }, [broadcastConnection, createHostTokenMutation, hostSession]);

  const endRoom = useCallback(async (): Promise<RtcEndRoomResponse> => {
    if (!hostSession) {
      throw new Error("RTC 방 정보가 없습니다. 방 종료를 다시 시도해주세요.");
    }

    const images = getPreparedEndImages();
    try {
      return await endRoomMutation.mutateAsync({
        roomId: hostSession.roomId,
        request: images.length > 0 ? { images } : undefined,
      });
    } catch (error) {
      throw new Error(
        getApiErrorMessage(
          error,
          "사진 저장 및 RTC 방 종료 요청에 실패했습니다. 종료 처리를 다시 시도해주세요.",
        ),
      );
    }
  }, [endRoomMutation, getPreparedEndImages, hostSession]);

  const completeTermination = useCallback(
    async (result: RtcEndRoomResponse) => {
      const savedImages = result.savedImages.map(({ id, url }) => ({
        id,
        imageUrl: url,
      }));
      const localImages = getSelectedEndPhotos().map(({ id, uri }) => ({
        id,
        imageUrl: uri,
      }));

      clearHostSession();
      setBroadcastConnection(null);
      setFinalizationState("IDLE");
      setEndRequestId(0);
      onResultReady(savedImages.length > 0 ? savedImages : localImages);

      if (savedImages.length > 0) {
        try {
          await resetMyRtcStoredPhotos();
        } catch {
          onResultRefreshError();
        }
      }
    },
    [
      clearHostSession,
      getSelectedEndPhotos,
      onResultReady,
      onResultRefreshError,
      resetMyRtcStoredPhotos,
    ],
  );

  const requestTermination = useCallback(() => {
    if (!broadcastConnection || isRtcFinalizationPending(finalizationState)) {
      return;
    }
    setEndRequestId((current) => current + 1);
  }, [broadcastConnection, finalizationState]);

  const handleFinalizationStateChange = useCallback(
    (state: RtcHostFinalizationState) => setFinalizationState(state),
    [],
  );

  return {
    hostSession,
    broadcastConnection,
    participants: roomData?.participants ?? [],
    endRequestId,
    finalizationState,
    isBusy:
      createRoomMutation.isPending ||
      createHostTokenMutation.isPending ||
      endRoomMutation.isPending ||
      isRtcFinalizationPending(finalizationState),
    isStarting: createHostTokenMutation.isPending || endRoomMutation.isPending,
    isExitBlocked:
      Boolean(broadcastConnection) ||
      isRtcFinalizationBlocking(finalizationState),
    isFinalizationBlocking: isRtcFinalizationBlocking(finalizationState),
    isFinalizationPending: isRtcFinalizationPending(finalizationState),
    prepareSharing,
    cancelPreparedSharing,
    startBroadcast,
    requestTermination,
    prepareEndPhotos,
    endRoom,
    completeTermination,
    handleFinalizationStateChange,
  };
}
