import {
  decodeRtcRoomEndedRpcPayload,
  RTC_ROOM_ENDED_RPC_ACK,
  RTC_ROOM_ENDED_RPC_METHOD,
  type RtcEndRoomResponse,
  type RtcRoomResponse,
} from "@entities/rtc-room";
import type { RtcLiveKitConnection } from "@entities/rtc-session";
import {
  LiveKitRoom,
  useConnectionState,
  useRoomContext,
  useTracks,
  VideoTrack,
} from "@livekit/react-native";
import {
  Box,
  Button,
  ButtonIcon,
  FramingGridOverlay,
  Text,
  VStack,
} from "@shared/ui";
import { IconX } from "@tabler/icons-react-native";
import { ConnectionState, Track } from "livekit-client";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { RtcViewerExitResult } from "../model/use-rtc-viewer-exit-controller";
import { RtcViewerWaiting } from "./rtc-viewer-waiting";

type DisconnectLiveKit = () => Promise<void>;

interface RtcViewerLiveKitProps {
  connection: RtcLiveKitConnection;
  roomId: string;
  rtcRoom: RtcRoomResponse | null;
  reactionPicker: ReactNode;
  isExiting: boolean;
  exitRequestId: number;
  onRequestExit: (
    disconnectLiveKit: DisconnectLiveKit,
  ) => Promise<RtcViewerExitResult>;
  onRoomEnded: (result: RtcEndRoomResponse) => void | Promise<void>;
}

interface ViewerRoomContentProps extends Omit<
  RtcViewerLiveKitProps,
  "connection"
> {
  connectionError: string | null;
}

function ViewerRoomContent({
  connectionError,
  roomId,
  rtcRoom,
  reactionPicker,
  isExiting,
  exitRequestId,
  onRequestExit,
  onRoomEnded,
}: ViewerRoomContentProps) {
  const room = useRoomContext();
  const connectionState = useConnectionState();
  const cameraTracks = useTracks([Track.Source.Camera], {
    onlySubscribed: true,
  });
  const remoteCameraTrack = cameraTracks.find(
    ({ participant }) => !participant.isLocal,
  );
  const hostNickname = rtcRoom?.host.nickname.trim() || "호스트";
  const isHandlingRoomEndRef = useRef(false);
  const handledExitRequestIdRef = useRef(exitRequestId);
  const deliveredResultRef = useRef<RtcEndRoomResponse | null>(null);

  const handleCancel = useCallback(async () => {
    const result = await onRequestExit(() => room.disconnect());
    if (!result.ok) {
      Alert.alert("RTC 방 나가기 실패", result.errorMessage);
    }
  }, [onRequestExit, room]);

  useEffect(() => {
    room.registerRpcMethod(
      RTC_ROOM_ENDED_RPC_METHOD,
      async ({ callerIdentity, payload }) => {
        const caller = room.remoteParticipants.get(callerIdentity);
        const result = decodeRtcRoomEndedRpcPayload(payload);

        if (
          caller?.permissions?.canPublish !== true ||
          !result ||
          result.roomId !== roomId
        ) {
          throw new Error("유효하지 않은 RTC 종료 결과입니다.");
        }

        if (!isHandlingRoomEndRef.current) {
          isHandlingRoomEndRef.current = true;
          deliveredResultRef.current = result;

          // ACK가 Host에 도착한 다음 macrotask에서 Room을 정리하고
          // 결과 화면으로 전환합니다.
          setTimeout(() => {
            const deliveredResult = deliveredResultRef.current;
            if (!deliveredResult) return;

            void (async () => {
              try {
                await room.disconnect();
              } finally {
                await onRoomEnded(deliveredResult);
              }
            })();
          }, 0);
        }

        return RTC_ROOM_ENDED_RPC_ACK;
      },
    );

    return () => {
      room.unregisterRpcMethod(RTC_ROOM_ENDED_RPC_METHOD);
    };
  }, [onRoomEnded, room, roomId]);

  useEffect(() => {
    if (
      exitRequestId <= handledExitRequestIdRef.current ||
      exitRequestId <= 0
    ) {
      return;
    }

    handledExitRequestIdRef.current = exitRequestId;
    void handleCancel();
  }, [exitRequestId, handleCancel]);

  if (!remoteCameraTrack) {
    return (
      <View className="flex-1 bg-black">
        <RtcViewerWaiting
          hostNickname={hostNickname}
          isConnecting={
            connectionState !== ConnectionState.Connected && !connectionError
          }
          isCanceling={isExiting}
          onCancel={() => void handleCancel()}
        />
        {connectionError ? (
          <Box className="absolute left-6 right-6 top-16 rounded-xl bg-red-500 px-4 py-3">
            <Text className="text-center text-white">{connectionError}</Text>
          </Box>
        ) : null}
      </View>
    );
  }

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={{ flex: 1, backgroundColor: "white" }}
    >
      <View className="relative min-h-24 flex-row items-center justify-center bg-white px-16 py-4">
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-4 rounded-full"
          disabled={isExiting}
          isLoading={isExiting}
          accessibilityLabel={
            isExiting ? "실시간 공유에서 나가는 중" : "실시간 공유 나가기"
          }
          onPress={() => void handleCancel()}
        >
          <ButtonIcon as={IconX} className="h-7 w-7" />
        </Button>

        <VStack className="items-center gap-1">
          <Text className="text-center text-label-muted">
            {hostNickname} 님의 실시간 공유
          </Text>
          <Text size="2xl" bold className="text-center text-foreground">
            사진에 찍히는 내 모습
          </Text>
        </VStack>
      </View>

      <View className="relative flex-1 overflow-hidden bg-black">
        <VideoTrack
          trackRef={remoteCameraTrack}
          style={StyleSheet.absoluteFill}
          objectFit="contain"
        />
        <FramingGridOverlay />
        {connectionError ? (
          <Box className="absolute left-6 right-6 top-6 rounded-xl bg-red-500 px-4 py-3">
            <Text className="text-center text-white">{connectionError}</Text>
          </Box>
        ) : null}
      </View>

      <View className="min-h-24 justify-center bg-white py-3">
        {reactionPicker}
      </View>
    </SafeAreaView>
  );
}

export function RtcViewerLiveKit({
  connection,
  roomId,
  rtcRoom,
  reactionPicker,
  isExiting,
  exitRequestId,
  onRequestExit,
  onRoomEnded,
}: RtcViewerLiveKitProps) {
  const [connectionError, setConnectionError] = useState<string | null>(null);

  return (
    <LiveKitRoom
      serverUrl={connection.url}
      token={connection.token}
      connect
      audio={false}
      video={false}
      options={{ adaptiveStream: { pixelDensity: "screen" } }}
      onConnected={() => setConnectionError(null)}
      onDisconnected={() =>
        setConnectionError("LiveKit 연결이 종료되었습니다.")
      }
      onError={(error) => setConnectionError(error.message)}
    >
      <ViewerRoomContent
        connectionError={connectionError}
        roomId={roomId}
        rtcRoom={rtcRoom}
        reactionPicker={reactionPicker}
        isExiting={isExiting}
        exitRequestId={exitRequestId}
        onRequestExit={onRequestExit}
        onRoomEnded={onRoomEnded}
      />
    </LiveKitRoom>
  );
}
