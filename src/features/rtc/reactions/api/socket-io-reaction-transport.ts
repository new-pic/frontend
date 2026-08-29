import { env } from "@shared/config";
import { io, type Socket } from "socket.io-client";
import { RTC_REACTION_SOCKET_CONFIG } from "../config/rtc-reaction-config";
import {
  createRtcReactionHostJoinPayload,
  createRtcReactionViewerJoinPayload,
  getRtcReactionJoinEvent,
  getRtcReactionJoinRetryDelay,
  isRtcReactionJoinSuccess,
} from "../lib/rtc-reaction-join";
import { getRtcReactionServerUrl } from "../lib/rtc-reaction-endpoint";
import { parseRtcReceivedReaction } from "../lib/rtc-reaction-domain";
import type {
  RtcReactionConnectionStatus,
  RtcReactionHostJoinPayload,
  RtcReactionJoinResponse,
  RtcReactionRole,
  RtcReceivedReaction,
  RtcReactionViewerJoinPayload,
} from "../model/types";

interface RtcReactionServerEvents {
  "rtc:feedback:received": (payload: unknown) => void;
}

interface RtcReactionClientEvents {
  "rtc:host:join": (
    payload: RtcReactionHostJoinPayload,
    acknowledgement: (response: RtcReactionJoinResponse) => void,
  ) => void;
  "rtc:viewer:join": (
    payload: RtcReactionViewerJoinPayload,
    acknowledgement: (response: RtcReactionJoinResponse) => void,
  ) => void;
  "rtc:feedback:send": (payload: { emojiId: string }) => void;
}

type RtcReactionSocket = Socket<
  RtcReactionServerEvents,
  RtcReactionClientEvents
>;

export interface RtcReactionTransport {
  connect: () => void;
  disconnect: () => void;
  send: (emojiId: string) => boolean;
}

interface CreateRtcReactionTransportOptions {
  accessToken: string;
  role: RtcReactionRole;
  roomId: string;
  participantId?: string;
  onReaction: (reaction: RtcReceivedReaction) => void;
  onStatusChange: (status: RtcReactionConnectionStatus, error?: string) => void;
}

export const createSocketIoReactionTransport = ({
  accessToken,
  role,
  roomId,
  participantId,
  onReaction,
  onStatusChange,
}: CreateRtcReactionTransportOptions): RtcReactionTransport => {
  if (!env.API_URL) {
    throw new Error("API_URL is not configured");
  }

  const normalizedRoomId = roomId.trim();
  const normalizedParticipantId = participantId?.trim() ?? "";
  if (!normalizedRoomId) {
    throw new Error("RTC reaction roomId is required");
  }
  if (role === "VIEWER" && !normalizedParticipantId) {
    throw new Error("RTC reaction participantId is required");
  }

  const serverUrl = getRtcReactionServerUrl(env.API_URL);
  const socket: RtcReactionSocket = io(
    `${serverUrl}${RTC_REACTION_SOCKET_CONFIG.namespace}`,
    {
      path: RTC_REACTION_SOCKET_CONFIG.path,
      auth: { token: accessToken },
      autoConnect: false,
      forceNew: true,
      reconnection: true,
      timeout: RTC_REACTION_SOCKET_CONFIG.connectionTimeoutMs,
      transports: ["websocket", "polling"],
      tryAllTransports: true,
    },
  );

  let joined = false;
  let disposed = false;
  let connectionEpoch = 0;
  let joinRetryAttempt = 0;
  let joinRetryTimer: ReturnType<typeof setTimeout> | null = null;

  const clearJoinRetry = () => {
    if (joinRetryTimer === null) return;
    clearTimeout(joinRetryTimer);
    joinRetryTimer = null;
  };

  const logJoinFailure = (
    error: Error | null,
    response: RtcReactionJoinResponse | undefined,
    retryDelayMs: number,
  ) => {
    if (!__DEV__) return;
    console.error("[RTC Reaction] join failed", {
      role,
      roomId: normalizedRoomId,
      event: getRtcReactionJoinEvent(role),
      error: error?.message,
      response,
      retryDelayMs,
    });
  };

  const getJoinErrorMessage = (
    error: Error | null,
    response: RtcReactionJoinResponse | undefined,
  ) =>
    error?.message || response?.message || "반응 채널에 참여하지 못했습니다.";

  function scheduleJoinRetry(
    epoch: number,
    error: Error | null,
    response: RtcReactionJoinResponse | undefined,
  ) {
    if (disposed || epoch !== connectionEpoch) return;

    joined = false;
    clearJoinRetry();
    const retryDelayMs = getRtcReactionJoinRetryDelay(joinRetryAttempt);
    joinRetryAttempt += 1;
    onStatusChange("ERROR", getJoinErrorMessage(error, response));
    logJoinFailure(error, response, retryDelayMs);

    joinRetryTimer = setTimeout(() => {
      joinRetryTimer = null;
      if (disposed || epoch !== connectionEpoch) return;

      if (!socket.connected) {
        onStatusChange("CONNECTING");
        socket.connect();
        return;
      }

      joinRoom(epoch);
    }, retryDelayMs);
  }

  function handleJoinAcknowledgement(
    epoch: number,
    error: Error | null,
    response: RtcReactionJoinResponse | undefined,
  ) {
    if (disposed || epoch !== connectionEpoch) return;

    if (error || !isRtcReactionJoinSuccess(response)) {
      scheduleJoinRetry(epoch, error, response);
      return;
    }

    clearJoinRetry();
    joined = true;
    joinRetryAttempt = 0;
    onStatusChange("CONNECTED");
    if (__DEV__) {
      console.info("[RTC Reaction] joined", {
        role,
        roomId: normalizedRoomId,
        event: getRtcReactionJoinEvent(role),
        socketId: socket.id,
      });
    }
  }

  function joinRoom(epoch: number) {
    if (disposed || epoch !== connectionEpoch || !socket.connected) {
      return;
    }

    joined = false;
    onStatusChange("CONNECTING");
    if (__DEV__) {
      console.info("[RTC Reaction] joining", {
        role,
        roomId: normalizedRoomId,
        event: getRtcReactionJoinEvent(role),
        socketId: socket.id,
      });
    }

    if (role === "HOST") {
      socket
        .timeout(RTC_REACTION_SOCKET_CONFIG.joinAckTimeoutMs)
        .emit(
          RTC_REACTION_SOCKET_CONFIG.hostJoinEvent,
          createRtcReactionHostJoinPayload(normalizedRoomId),
          (error, response) =>
            handleJoinAcknowledgement(epoch, error, response),
        );
      return;
    }

    socket
      .timeout(RTC_REACTION_SOCKET_CONFIG.joinAckTimeoutMs)
      .emit(
        RTC_REACTION_SOCKET_CONFIG.viewerJoinEvent,
        createRtcReactionViewerJoinPayload(
          normalizedRoomId,
          normalizedParticipantId,
        ),
        (error, response) => handleJoinAcknowledgement(epoch, error, response),
      );
  }

  const handleReceived = (payload: unknown) => {
    const reaction = parseRtcReceivedReaction(payload);
    if (!reaction) {
      if (__DEV__) {
        console.warn("[RTC Reaction] ignored invalid payload", {
          role,
          roomId: normalizedRoomId,
          payload,
        });
      }
      return;
    }

    if (__DEV__) {
      console.info("[RTC Reaction] received", {
        role,
        roomId: normalizedRoomId,
        emojiId: reaction.emojiId,
      });
    }
    onReaction(reaction);
  };
  const handleConnect = () => {
    connectionEpoch += 1;
    const epoch = connectionEpoch;
    joined = false;
    joinRetryAttempt = 0;
    clearJoinRetry();
    if (__DEV__) {
      console.info("[RTC Reaction] socket connected", {
        role,
        roomId: normalizedRoomId,
        socketId: socket.id,
      });
    }
    joinRoom(epoch);
  };
  const handleDisconnect = (reason: string) => {
    connectionEpoch += 1;
    joined = false;
    clearJoinRetry();
    onStatusChange("DISCONNECTED");
    if (__DEV__) {
      console.info("[RTC Reaction] socket disconnected", {
        role,
        roomId: normalizedRoomId,
        reason,
      });
    }
  };
  const handleConnectError = (error: Error) => {
    joined = false;
    onStatusChange("ERROR", error.message);
    if (__DEV__) {
      console.error("[RTC Reaction] connection failed", {
        role,
        roomId: normalizedRoomId,
        error: error.message,
      });
    }
  };

  socket.on(RTC_REACTION_SOCKET_CONFIG.receivedEvent, handleReceived);
  socket.on("connect", handleConnect);
  socket.on("disconnect", handleDisconnect);
  socket.on("connect_error", handleConnectError);

  return {
    connect: () => {
      disposed = false;
      onStatusChange("CONNECTING");
      socket.connect();
    },
    disconnect: () => {
      disposed = true;
      connectionEpoch += 1;
      joined = false;
      clearJoinRetry();
      socket.off(RTC_REACTION_SOCKET_CONFIG.receivedEvent, handleReceived);
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.disconnect();
    },
    send: (emojiId) => {
      if (role !== "VIEWER" || !socket.connected || !joined) {
        if (__DEV__) {
          console.warn("[RTC Reaction] send blocked", {
            role,
            roomId: normalizedRoomId,
            socketConnected: socket.connected,
            joined,
            emojiId,
          });
        }
        return false;
      }

      socket.emit(RTC_REACTION_SOCKET_CONFIG.sendEvent, {
        emojiId,
      });
      if (__DEV__) {
        console.info("[RTC Reaction] emitted", {
          event: RTC_REACTION_SOCKET_CONFIG.sendEvent,
          roomId: normalizedRoomId,
          emojiId,
        });
      }
      return true;
    },
  };
};
