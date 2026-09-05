import {
  encodeRtcRoomEndedRpcPayload,
  RTC_ROOM_ENDED_RPC_ACK,
  RTC_ROOM_ENDED_RPC_METHOD,
  RtcEndRoomResponse,
} from "@entities/rtc-room";
import {
  createVisionCameraVideoPublisher,
  type RtcLiveKitConnection,
  type RtcVideoPublisher,
  type RtcVideoPublisherFactory,
} from "@entities/rtc-session";
import type { RtcHostFinalizationState } from "../model/rtc-host-control";
import { useRtcHostTerminationController } from "../model/use-rtc-host-termination-controller";
import {
  RoomContext,
  useConnectionState,
  useRoomContext,
} from "@livekit/react-native";
import { Button, ButtonText, Text, VStack } from "@shared/ui";
import { ConnectionState, Room, RoomEvent } from "livekit-client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const isRoomConnected = (room: Room) =>
  room.state === ConnectionState.Connected;

interface RtcHostLiveKitProps {
  connection: RtcLiveKitConnection;
  isActive: boolean;
  onPrepareEndRoom: () => Promise<void>;
  onEndRoom: () => Promise<RtcEndRoomResponse>;
  onStopped: (result: RtcEndRoomResponse) => void | Promise<void>;
  endRequestId?: number;
  onFinalizationStateChange?: (state: RtcHostFinalizationState) => void;
  publisherFactory?: RtcVideoPublisherFactory;
}

interface HostRoomContentProps {
  canPublish: boolean;
  connectionError: string | null;
  disconnectRoom: () => Promise<void>;
  ensureConnected: () => Promise<void>;
  isActive: boolean;
  onPrepareEndRoom: () => Promise<void>;
  onEndRoom: () => Promise<RtcEndRoomResponse>;
  onStopped: (result: RtcEndRoomResponse) => void | Promise<void>;
  endRequestId: number;
  onFinalizationStateChange?: (state: RtcHostFinalizationState) => void;
  publisher: RtcVideoPublisher;
}

function HostRoomContent({
  canPublish,
  connectionError,
  disconnectRoom,
  ensureConnected,
  isActive,
  onPrepareEndRoom,
  onEndRoom,
  onStopped,
  endRequestId,
  onFinalizationStateChange,
  publisher,
}: HostRoomContentProps) {
  const room = useRoomContext();
  const connectionState = useConnectionState();
  const isMountedRef = useRef(true);
  const isActiveRef = useRef(isActive);
  const canPublishRef = useRef(canPublish);
  const hasPublisherStartBeenRequestedRef = useRef(false);
  const handledEndRequestIdRef = useRef(endRequestId);
  const [publisherError, setPublisherError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
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
      hasPublisherStartBeenRequestedRef.current
    ) {
      return;
    }

    hasPublisherStartBeenRequestedRef.current = true;
    setIsPublishing(true);
    setPublisherError(null);

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
    if (canPublish && connectionState === ConnectionState.Connected) {
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
      const currentViewers = [...room.remoteParticipants.values()];
      const acknowledgements = await Promise.allSettled(
        currentViewers.map(async (participant) => {
          const response = await room.localParticipant.performRpc({
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

  const {
    clearError: clearFinalizationError,
    errorMessage: finalizationErrorMessage,
    requestTermination,
  } = useRtcHostTerminationController({
    preparePhotos: onPrepareEndRoom,
    stopPublishing: () => publisher.stop(),
    endRoom: onEndRoom,
    deliverResult,
    disconnectRoom,
    onCompleted: onStopped,
    onStateChange: onFinalizationStateChange,
    onNonFatalError: (stage, error) => {
      console.error("[RTC Host] post-end cleanup failed", {
        stage,
        error,
        roomId: room.name,
      });
    },
  });

  useEffect(() => {
    if (!finalizationErrorMessage) return;

    Alert.alert(
      "RTC 방 종료 실패",
      finalizationErrorMessage,
      [
        {
          text: "닫기",
          style: "cancel",
          onPress: clearFinalizationError,
        },
        {
          text: "종료 처리 다시 시도",
          onPress: () => {
            clearFinalizationError();
            void requestTermination();
          },
        },
      ],
      {
        cancelable: true,
        onDismiss: clearFinalizationError,
      },
    );
  }, [clearFinalizationError, finalizationErrorMessage, requestTermination]);

  useEffect(() => {
    if (endRequestId <= handledEndRequestIdRef.current || endRequestId <= 0) {
      return;
    }

    handledEndRequestIdRef.current = endRequestId;
    void requestTermination();
  }, [endRequestId, requestTermination]);

  const errorMessage = publisherError ?? connectionError;

  return (
    <View pointerEvents="box-none" className="absolute inset-0 z-[15]">
      <SafeAreaView pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        <View pointerEvents="box-none" className="flex-1 px-5 pt-16">
          {errorMessage ? (
            <VStack className="mt-3 items-center gap-3 rounded-2xl bg-black/70 p-4">
              <Text className="text-center text-white">{errorMessage}</Text>
              <Button
                variant="outline"
                disabled={
                  isPublishing || connectionState !== ConnectionState.Connected
                }
                onPress={() => void startPublisher()}
              >
                <ButtonText>영상 송출 다시 시작</ButtonText>
              </Button>
            </VStack>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

export function RtcHostLiveKit({
  connection,
  isActive,
  onPrepareEndRoom,
  onEndRoom,
  onStopped,
  endRequestId = 0,
  onFinalizationStateChange,
  publisherFactory = createVisionCameraVideoPublisher,
}: RtcHostLiveKitProps) {
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
  const [connectionReadyEpoch, setConnectionReadyEpoch] = useState<
    number | null
  >(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  isActiveRef.current = isActive;
  const canPublish =
    isActive && connectionReadyEpoch === lifecycleEpochRef.current;

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
        disconnectRoom={stopAndDisconnect}
        ensureConnected={ensureConnected}
        isActive={isActive}
        onPrepareEndRoom={onPrepareEndRoom}
        onEndRoom={onEndRoom}
        onStopped={onStopped}
        endRequestId={endRequestId}
        onFinalizationStateChange={onFinalizationStateChange}
        publisher={publisher}
      />
    </RoomContext.Provider>
  );
}
