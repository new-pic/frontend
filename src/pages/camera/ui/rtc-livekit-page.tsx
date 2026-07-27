import {
  createVisionCameraVideoPublisher,
  decodeRtcRoomEndedRpcPayload,
  encodeRtcRoomEndedRpcPayload,
  RTC_ROOM_ENDED_RPC_ACK,
  RTC_ROOM_ENDED_RPC_METHOD,
  RtcEndRoomResponse,
  RtcLiveKitConnection,
  RtcVideoPublisher,
  RtcVideoPublisherFactory,
} from "@entities/rtc";
import {
  LiveKitRoom,
  RoomContext,
  VideoTrack,
  useConnectionState,
  useRemoteParticipants,
  useRoomContext,
  useTracks,
} from "@livekit/react-native";
import {
  Box,
  Button,
  ButtonSpinner,
  ButtonText,
  Center,
  HStack,
  Text,
  VStack,
} from "@shared/ui";
import {
  ConnectionState,
  Room,
  RoomEvent,
  Track,
} from "livekit-client";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  BackHandler,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SharingWaitingPage } from "./sharing-waiting-page";

const isRoomConnected = (room: Room) =>
  room.state === ConnectionState.Connected;

interface RtcHostLiveKitPageProps {
  connection: RtcLiveKitConnection;
  isActive: boolean;
  onPrepareEndRoom: () => Promise<void>;
  onEndRoom: () => Promise<RtcEndRoomResponse>;
  onStopped: (
    result: RtcEndRoomResponse,
  ) => void | Promise<void>;
  publisherFactory?: RtcVideoPublisherFactory;
}

interface RtcViewerLiveKitPageProps {
  connection: RtcLiveKitConnection;
  roomId: string;
  onCancel: () => void | Promise<void>;
  onRoomEnded: (
    result: RtcEndRoomResponse,
  ) => void | Promise<void>;
}

interface HostRoomContentProps {
  canPublish: boolean;
  connectionError: string | null;
  ensureConnected: () => Promise<void>;
  isActive: boolean;
  onPrepareEndRoom: () => Promise<void>;
  onEndRoom: () => Promise<RtcEndRoomResponse>;
  onStopped: (
    result: RtcEndRoomResponse,
  ) => void | Promise<void>;
  publisher: RtcVideoPublisher;
}

function HostRoomContent({
  canPublish,
  connectionError,
  ensureConnected,
  isActive,
  onPrepareEndRoom,
  onEndRoom,
  onStopped,
  publisher,
}: HostRoomContentProps) {
  const room = useRoomContext();
  const connectionState = useConnectionState();
  const remoteParticipants = useRemoteParticipants();
  const isMountedRef = useRef(true);
  const isActiveRef = useRef(isActive);
  const canPublishRef = useRef(canPublish);
  const hasPublisherStartBeenRequestedRef = useRef(false);
  const isStoppingRef = useRef(false);
  const hasStopBeenRequestedRef = useRef(false);
  const completedResultRef =
    useRef<RtcEndRoomResponse | null>(null);
  const [publisherError, setPublisherError] = useState<string | null>(
    null,
  );
  const [isFinalizationError, setIsFinalizationError] =
    useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  isActiveRef.current = isActive;
  canPublishRef.current = canPublish;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!canPublish) {
      // blur cleanup이 publisher.stop()을 queue에 넣습니다. 다음 focus의
      // Connected 이벤트에서는 같은 publisher를 다시 시작할 수 있어야
      // 하므로 요청 guard도 함께 초기화합니다.
      hasPublisherStartBeenRequestedRef.current = false;
    }
  }, [canPublish]);

  const startPublisher = useCallback(async () => {
    if (
      !canPublishRef.current ||
      connectionState !== ConnectionState.Connected ||
      hasStopBeenRequestedRef.current ||
      hasPublisherStartBeenRequestedRef.current
    ) {
      return;
    }

    hasPublisherStartBeenRequestedRef.current = true;
    setIsPublishing(true);
    setPublisherError(null);
    setIsFinalizationError(false);

    try {
      await publisher.start();
    } catch (error) {
      hasPublisherStartBeenRequestedRef.current = false;
      try {
        await publisher.stop();
      } catch {
        // 정리 오류보다 원래 start 오류를 사용자에게 우선 표시합니다.
      }
      if (!isMountedRef.current) return;
      setPublisherError(
        error instanceof Error
          ? error.message
          : "VisionCamera 영상 송출을 시작하지 못했습니다.",
      );
    } finally {
      if (isMountedRef.current) {
        setIsPublishing(false);
      }
    }
  }, [connectionState, publisher]);

  useEffect(() => {
    if (
      canPublish &&
      connectionState === ConnectionState.Connected
    ) {
      void startPublisher();
    }
  }, [canPublish, connectionState, startPublisher]);

  const deliverResult = useCallback(
    async (result: RtcEndRoomResponse) => {
      if (!isActiveRef.current) {
        throw new Error(
          "화면을 벗어나 결과 전송이 중단되었습니다. 카메라 화면으로 돌아와 다시 시도해주세요.",
        );
      }

      if (room.state !== ConnectionState.Connected) {
        await ensureConnected();
      }

      if (!isActiveRef.current) {
        throw new Error(
          "화면을 벗어나 결과 전송이 중단되었습니다. 카메라 화면으로 돌아와 다시 시도해주세요.",
        );
      }

      const payload = encodeRtcRoomEndedRpcPayload(result);
      const currentViewers = [
        ...room.remoteParticipants.values(),
      ];
      const acknowledgements = await Promise.allSettled(
        currentViewers.map(async (participant) => {
          const response =
            await room.localParticipant.performRpc({
              destinationIdentity: participant.identity,
              method: RTC_ROOM_ENDED_RPC_METHOD,
              payload,
              responseTimeout: 8_000,
            });

          if (response !== RTC_ROOM_ENDED_RPC_ACK) {
            throw new Error(
              `${participant.identity}의 결과 수신 확인값이 올바르지 않습니다.`,
            );
          }
        }),
      );
      const failedCount = acknowledgements.filter(
        ({ status }) => status === "rejected",
      ).length;

      if (failedCount > 0) {
        throw new Error(
          `${failedCount}명의 참여자가 사진 결과를 확인하지 못했습니다.`,
        );
      }
    },
    [ensureConnected, room],
  );

  const handleStop = useCallback(async () => {
    if (isStoppingRef.current) return;

    isStoppingRef.current = true;
    hasStopBeenRequestedRef.current = true;
    setIsStopping(true);
    setPublisherError(null);
    setIsFinalizationError(false);

    let result = completedResultRef.current;
    let finalizationError: unknown;

    try {
      // 호스트가 사진을 고르는 동안에는 기존 영상 송출을 유지합니다.
      // 선택을 확정한 뒤에만 publisher와 native frame sink를 정리합니다.
      await onPrepareEndRoom();

      // publisher 내부에서 frame sink 차단 → unpublish → raw track
      // stop/release 순서로 정리합니다.
      await publisher.stop();

      if (!result) {
        result = await onEndRoom();
        completedResultRef.current = result;
      }

      // 화면 cleanup이 이미 시작됐다면 결과 전송을 위해 Room을 다시
      // 연결하지 않습니다. 아래 finally에서 마지막 disconnect만 보장합니다.
      if (!isMountedRef.current) return;

      await deliverResult(result);
    } catch (error) {
      finalizationError = error;
    } finally {
      // API/RPC가 실패해도 카메라 track과 Room 연결이 남지 않습니다.
      try {
        await publisher.stop();
      } catch (error) {
        finalizationError ??= error;
      }
      try {
        await room.disconnect();
      } catch (error) {
        finalizationError ??= error;
      }
    }

    if (finalizationError || !result) {
      if (isMountedRef.current) {
        setPublisherError(
          finalizationError instanceof Error
            ? finalizationError.message
            : "RTC 공유 종료에 실패했습니다. 종료 처리를 다시 시도해주세요.",
        );
        setIsFinalizationError(true);
        setIsStopping(false);
      }
      isStoppingRef.current = false;
      return;
    }

    try {
      await onStopped(result);
    } finally {
      isStoppingRef.current = false;
      if (isMountedRef.current) {
        setIsStopping(false);
      }
    }
  }, [
    deliverResult,
    onPrepareEndRoom,
    onEndRoom,
    onStopped,
    publisher,
    room,
  ]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        void handleStop();
        return true;
      },
    );

    return () => subscription.remove();
  }, [handleStop]);

  const statusMessage =
    connectionState === ConnectionState.Connected
      ? isPublishing
        ? "VisionCamera 영상 연결 중"
        : "LIVE"
      : connectionState === ConnectionState.Reconnecting ||
          connectionState === ConnectionState.SignalReconnecting
        ? "다시 연결하는 중..."
        : connectionState === ConnectionState.Disconnected
          ? "연결 종료됨"
          : "연결 중...";
  const errorMessage = publisherError ?? connectionError;

  return (
    <View pointerEvents="box-none" style={styles.hostOverlay}>
      <SafeAreaView
        pointerEvents="box-none"
        style={StyleSheet.absoluteFill}
      >
        <View pointerEvents="box-none" style={styles.hostControls}>
          <HStack className="items-center justify-between rounded-2xl bg-black/55 px-4 py-3">
            <HStack className="items-center gap-2">
              <Box className="h-2.5 w-2.5 rounded-full bg-red-500" />
              <Text bold className="text-white">
                {statusMessage}
              </Text>
            </HStack>
            <HStack className="items-center gap-3">
              <Text className="text-white">
                참여자 {remoteParticipants.length}명
              </Text>
              <Button
                variant="destructive"
                size="sm"
                disabled={isStopping}
                onPress={() => void handleStop()}
              >
                {isStopping ? (
                  <ButtonSpinner color="white" />
                ) : null}
                <ButtonText>
                  {isStopping
                    ? "종료 중"
                    : completedResultRef.current
                      ? "결과 재전송"
                      : "공유 종료"}
                </ButtonText>
              </Button>
            </HStack>
          </HStack>

          {errorMessage ? (
            <VStack className="mt-3 items-center gap-3 rounded-2xl bg-black/70 p-4">
              <Text className="text-center text-white">
                {errorMessage}
              </Text>
              {!isFinalizationError ? (
                <Button
                  variant="outline"
                  disabled={
                    isPublishing ||
                    connectionState !== ConnectionState.Connected
                  }
                  onPress={() => void startPublisher()}
                >
                  <ButtonText>영상 송출 다시 시작</ButtonText>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  disabled={isStopping}
                  onPress={() => void handleStop()}
                >
                  <ButtonText>종료 처리 다시 시도</ButtonText>
                </Button>
              )}
            </VStack>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

export function RtcHostLiveKitPage({
  connection,
  isActive,
  onPrepareEndRoom,
  onEndRoom,
  onStopped,
  publisherFactory = createVisionCameraVideoPublisher,
}: RtcHostLiveKitPageProps) {
  const room = useMemo(
    () =>
      new Room({
        adaptiveStream: { pixelDensity: "screen" },
        dynacast: true,
      }),
    [],
  );
  const publisher = useMemo(
    () => publisherFactory(room),
    [publisherFactory, room],
  );
  const connectPromiseRef = useRef<Promise<void> | null>(null);
  const cleanupPromiseRef = useRef<Promise<void> | null>(null);
  const lifecycleEpochRef = useRef(0);
  const isActiveRef = useRef(isActive);
  const isMountedRef = useRef(true);
  const [connectionReadyEpoch, setConnectionReadyEpoch] =
    useState<number | null>(null);
  const [connectionError, setConnectionError] = useState<
    string | null
  >(null);
  isActiveRef.current = isActive;
  const canPublish =
    isActive &&
    connectionReadyEpoch === lifecycleEpochRef.current;

  const ensureConnected = useCallback(async () => {
    if (!isActiveRef.current) {
      throw new Error(
        "카메라 화면이 활성화된 동안에만 LiveKit에 연결할 수 있습니다.",
      );
    }

    const pendingCleanup = cleanupPromiseRef.current;
    if (pendingCleanup) {
      await pendingCleanup.catch(() => undefined);
    }

    if (!isActiveRef.current) {
      throw new Error(
        "카메라 화면이 활성화된 동안에만 LiveKit에 연결할 수 있습니다.",
      );
    }

    if (isRoomConnected(room)) {
      if (isMountedRef.current) {
        setConnectionReadyEpoch(lifecycleEpochRef.current);
      }
      return;
    }

    while (connectPromiseRef.current) {
      const pendingConnection = connectPromiseRef.current;
      try {
        await pendingConnection;
      } catch (error) {
        if (!isActiveRef.current) throw error;
      }

      if (isRoomConnected(room)) {
        if (isMountedRef.current) {
          setConnectionReadyEpoch(lifecycleEpochRef.current);
        }
        return;
      }
      if (!isActiveRef.current) {
        throw new Error(
          "카메라 화면이 활성화된 동안에만 LiveKit에 연결할 수 있습니다.",
        );
      }
    }

    const connectionEpoch = lifecycleEpochRef.current;
    if (isMountedRef.current) {
      setConnectionError(null);
    }

    let connectPromise: Promise<void>;
    connectPromise = room
      .connect(connection.url, connection.token)
      .then(async () => {
        if (
          !isActiveRef.current ||
          connectionEpoch !== lifecycleEpochRef.current
        ) {
          await room.disconnect();
          throw new Error(
            "카메라 화면이 비활성화되어 LiveKit 연결을 취소했습니다.",
          );
        }

        if (isMountedRef.current) {
          setConnectionReadyEpoch(connectionEpoch);
        }
      })
      .catch((error: unknown) => {
        const normalizedError =
          error instanceof Error
            ? error
            : new Error("LiveKit 연결에 실패했습니다.");
        if (
          isMountedRef.current &&
          isActiveRef.current &&
          connectionEpoch === lifecycleEpochRef.current
        ) {
          setConnectionError(normalizedError.message);
        }
        throw normalizedError;
      })
      .finally(() => {
        if (connectPromiseRef.current === connectPromise) {
          connectPromiseRef.current = null;
        }
      });
    connectPromiseRef.current = connectPromise;
    return connectPromise;
  }, [connection.token, connection.url, room]);

  const stopAndDisconnect = useCallback(() => {
    if (isMountedRef.current) {
      setConnectionReadyEpoch(null);
    }
    if (cleanupPromiseRef.current) {
      return cleanupPromiseRef.current;
    }

    // 이미 진행 중인 connect()가 나중에 resolve되더라도 해당 세대는
    // 더 이상 유효하지 않습니다. connect completion도 이를 확인하고
    // 즉시 disconnect합니다.
    lifecycleEpochRef.current += 1;
    const cleanupPromise = (async () => {
      try {
        await publisher.stop();
      } finally {
        await room.disconnect();
      }
    })().finally(() => {
      cleanupPromiseRef.current = null;
    });
    cleanupPromiseRef.current = cleanupPromise;
    return cleanupPromise;
  }, [publisher, room]);

  useEffect(() => {
    isMountedRef.current = true;
    const handleConnected = () => {
      if (isMountedRef.current && isActiveRef.current) {
        setConnectionError(null);
      }
    };
    const handleDisconnected = () => {
      if (isMountedRef.current && isActiveRef.current) {
        setConnectionError("LiveKit 연결이 종료되었습니다.");
      }
    };

    room
      .on(RoomEvent.Connected, handleConnected)
      .on(RoomEvent.Disconnected, handleDisconnected);

    return () => {
      isMountedRef.current = false;
      room
        .off(RoomEvent.Connected, handleConnected)
        .off(RoomEvent.Disconnected, handleDisconnected);

      // React cleanup은 await할 수 없으므로 같은 idempotent publisher
      // queue를 사용해 track을 먼저 해제한 뒤 Room을 종료합니다.
      void stopAndDisconnect().catch(() => undefined);
    };
  }, [room, stopAndDisconnect]);

  useEffect(() => {
    if (isActive) {
      void ensureConnected().catch(() => undefined);
    } else {
      // Expo Router가 화면 instance를 유지하더라도 physical camera와
      // signaling이 background에 남지 않도록 둘을 함께 정리합니다.
      void stopAndDisconnect().catch(() => undefined);
    }
  }, [ensureConnected, isActive, stopAndDisconnect]);

  return (
    <RoomContext.Provider value={room}>
      <HostRoomContent
        canPublish={canPublish}
        connectionError={connectionError}
        ensureConnected={ensureConnected}
        isActive={isActive}
        onPrepareEndRoom={onPrepareEndRoom}
        onEndRoom={onEndRoom}
        onStopped={onStopped}
        publisher={publisher}
      />
    </RoomContext.Provider>
  );
}

interface ViewerRoomContentProps {
  connectionError: string | null;
  roomId: string;
  onCancel: () => void | Promise<void>;
  onRoomEnded: (
    result: RtcEndRoomResponse,
  ) => void | Promise<void>;
}

function ViewerRoomContent({
  connectionError,
  roomId,
  onCancel,
  onRoomEnded,
}: ViewerRoomContentProps) {
  const room = useRoomContext();
  const connectionState = useConnectionState();
  const remoteParticipants = useRemoteParticipants();
  const cameraTracks = useTracks([Track.Source.Camera], {
    onlySubscribed: true,
  });
  const remoteCameraTrack = cameraTracks.find(
    ({ participant }) => !participant.isLocal,
  );
  const [isLeaving, setIsLeaving] = useState(false);
  const hostParticipant =
    remoteCameraTrack?.participant ??
    remoteParticipants.find(
      (participant) => participant.permissions?.canPublish,
    );
  const hostNickname =
    hostParticipant?.name || hostParticipant?.identity || undefined;

  const isLeavingRef = useRef(false);
  const deliveredResultRef = useRef<RtcEndRoomResponse | null>(null);

  const handleCancel = useCallback(async () => {
    if (isLeavingRef.current) return;

    isLeavingRef.current = true;
    setIsLeaving(true);
    try {
      await room.disconnect();
    } finally {
      await onCancel();
    }
  }, [onCancel, room]);

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

        if (!isLeavingRef.current) {
          isLeavingRef.current = true;
          deliveredResultRef.current = result;
          setIsLeaving(true);

          // RPC 응답이 host에 도착한 뒤 LiveKitRoom을 unmount하도록
          // 다음 macrotask에서 결과 화면 전환을 시작합니다.
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
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        void handleCancel();
        return true;
      },
    );

    return () => subscription.remove();
  }, [handleCancel]);

  if (!remoteCameraTrack) {
    return (
      <View style={styles.videoContainer}>
        <SharingWaitingPage
          hostNickname={hostNickname}
          isConnecting={
            connectionState !== ConnectionState.Connected &&
            !connectionError
          }
          onCancel={() => void handleCancel()}
        />
        {connectionError ? (
          <Box className="absolute left-6 right-6 top-16 rounded-xl bg-red-500 px-4 py-3">
            <Text className="text-center text-white">
              {connectionError}
            </Text>
          </Box>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.videoContainer}>
      <VideoTrack
        trackRef={remoteCameraTrack}
        style={StyleSheet.absoluteFill}
        objectFit="cover"
      />
      <SafeAreaView
        pointerEvents="box-none"
        style={StyleSheet.absoluteFill}
      >
        <VStack className="flex-1 justify-between px-5 py-4">
          <HStack className="self-start items-center gap-2 rounded-full bg-black/55 px-4 py-2">
            <Box className="h-2.5 w-2.5 rounded-full bg-red-500" />
            <Text bold className="text-white">
              실시간 공유
            </Text>
          </HStack>
          <Button
            variant="outline"
            size="lg"
            className="border-white bg-black/55"
            disabled={isLeaving}
            onPress={() => void handleCancel()}
          >
            <ButtonText className="text-white">
              {isLeaving ? "나가는 중..." : "나가기"}
            </ButtonText>
          </Button>
        </VStack>
      </SafeAreaView>
    </View>
  );
}

export function RtcViewerLiveKitPage({
  connection,
  roomId,
  onCancel,
  onRoomEnded,
}: RtcViewerLiveKitPageProps) {
  const [connectionError, setConnectionError] = useState<
    string | null
  >(null);

  return (
    <LiveKitRoom
      serverUrl={connection.url}
      token={connection.token}
      connect
      audio={false}
      video={false}
      options={{
        adaptiveStream: { pixelDensity: "screen" },
      }}
      onConnected={() => setConnectionError(null)}
      onDisconnected={() =>
        setConnectionError("LiveKit 연결이 종료되었습니다.")
      }
      onError={(error) => setConnectionError(error.message)}
    >
      <ViewerRoomContent
        connectionError={connectionError}
        roomId={roomId}
        onCancel={onCancel}
        onRoomEnded={onRoomEnded}
      />
    </LiveKitRoom>
  );
}

const styles = StyleSheet.create({
  videoContainer: {
    flex: 1,
    backgroundColor: "black",
  },
  hostOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 15,
  },
  hostControls: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 64,
  },
});
