import { env } from "@shared/config";
import { io, type Socket } from "socket.io-client";
import { RTC_REACTION_SOCKET_CONFIG } from "../config/rtc-reaction-config";
import { getRtcReactionServerUrl } from "../lib/rtc-reaction-endpoint";
import { parseRtcReceivedReaction } from "../lib/rtc-reaction-domain";
import type {
  RtcReactionConnectionStatus,
  RtcReceivedReaction,
} from "../model/types";

interface RtcReactionServerEvents {
  "rtc:feedback:received": (payload: unknown) => void;
}

interface RtcReactionClientEvents {
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
  onReaction: (reaction: RtcReceivedReaction) => void;
  onStatusChange: (
    status: RtcReactionConnectionStatus,
    error?: string,
  ) => void;
}

export const createSocketIoReactionTransport = ({
  accessToken,
  onReaction,
  onStatusChange,
}: CreateRtcReactionTransportOptions): RtcReactionTransport => {
  if (!env.API_URL) {
    throw new Error("API_URL is not configured");
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

  const handleReceived = (payload: unknown) => {
    const reaction = parseRtcReceivedReaction(payload);
    if (reaction) onReaction(reaction);
  };
  const handleConnect = () => onStatusChange("CONNECTED");
  const handleDisconnect = () => onStatusChange("DISCONNECTED");
  const handleConnectError = (error: Error) =>
    onStatusChange("ERROR", error.message);

  socket.on(
    RTC_REACTION_SOCKET_CONFIG.receivedEvent,
    handleReceived,
  );
  socket.on("connect", handleConnect);
  socket.on("disconnect", handleDisconnect);
  socket.on("connect_error", handleConnectError);

  return {
    connect: () => {
      onStatusChange("CONNECTING");
      socket.connect();
    },
    disconnect: () => {
      socket.off(
        RTC_REACTION_SOCKET_CONFIG.receivedEvent,
        handleReceived,
      );
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.disconnect();
    },
    send: (emojiId) => {
      if (!socket.connected) return false;

      socket.emit(RTC_REACTION_SOCKET_CONFIG.sendEvent, {
        emojiId,
      });
      if (__DEV__) {
        console.info("[RTC Reaction] emitted", {
          event: RTC_REACTION_SOCKET_CONFIG.sendEvent,
          emojiId,
        });
      }
      return true;
    },
  };
};
