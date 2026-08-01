import { useAuthStore } from "@shared/model";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createSocketIoReactionTransport } from "../api/socket-io-reaction-transport";
import { RTC_REACTION_SOCKET_CONFIG } from "../config/rtc-reaction-config";
import { canSendRtcReaction } from "../lib/rtc-reaction-domain";
import type {
  RtcReactionChannel,
  RtcReactionConnectionStatus,
  RtcReactionRole,
  RtcReceivedReaction,
} from "./types";

interface UseRtcReactionChannelOptions {
  active: boolean;
  roomId: string;
  role: RtcReactionRole;
  participantId?: string;
  onReaction?: (reaction: RtcReceivedReaction) => void;
}

export const useRtcReactionChannel = ({
  active,
  roomId,
  role,
  participantId,
  onReaction,
}: UseRtcReactionChannelOptions): RtcReactionChannel => {
  const accessToken = useAuthStore((state) => state.accessToken);
  const transportRef = useRef<ReturnType<
    typeof createSocketIoReactionTransport
  > | null>(null);
  const onReactionRef = useRef(onReaction);
  const lastSentAtRef = useRef<number | null>(null);
  const [status, setStatus] =
    useState<RtcReactionConnectionStatus>("IDLE");
  const [error, setError] = useState<string | null>(null);
  onReactionRef.current = onReaction;

  useEffect(() => {
    const normalizedRoomId = roomId.trim();
    const normalizedParticipantId = participantId?.trim() ?? "";
    const normalizedToken = accessToken?.trim() ?? "";
    if (!active || !normalizedRoomId || !normalizedToken) {
      transportRef.current = null;
      lastSentAtRef.current = null;
      setStatus("IDLE");
      setError(null);
      return;
    }
    if (role === "VIEWER" && !normalizedParticipantId) {
      transportRef.current = null;
      lastSentAtRef.current = null;
      setStatus("ERROR");
      setError("RTC 참여자 정보를 확인할 수 없습니다.");
      return;
    }

    let disposed = false;
    let transport: ReturnType<
      typeof createSocketIoReactionTransport
    >;

    try {
      transport = createSocketIoReactionTransport({
        accessToken: normalizedToken,
        role,
        roomId: normalizedRoomId,
        participantId:
          role === "VIEWER" ? normalizedParticipantId : undefined,
        onReaction: (reaction) => {
          if (!disposed && role === "HOST") {
            onReactionRef.current?.(reaction);
          }
        },
        onStatusChange: (nextStatus, message) => {
          if (disposed) return;
          setStatus(nextStatus);
          setError(
            nextStatus === "ERROR"
              ? message || "반응 서버에 연결하지 못했습니다."
              : null,
          );
        },
      });
    } catch (connectionError) {
      setStatus("ERROR");
      setError(
        connectionError instanceof Error
          ? connectionError.message
          : "반응 서버를 준비하지 못했습니다.",
      );
      return;
    }

    transportRef.current = transport;
    lastSentAtRef.current = null;
    transport.connect();

    return () => {
      disposed = true;
      if (transportRef.current === transport) {
        transportRef.current = null;
      }
      lastSentAtRef.current = null;
      transport.disconnect();
    };
  }, [accessToken, active, participantId, role, roomId]);

  const sendReaction = useCallback(
    (emojiId: string): boolean => {
      if (role !== "VIEWER") return false;

      const normalizedEmojiId = emojiId.trim();
      if (!normalizedEmojiId) return false;

      const now = Date.now();
      if (
        !canSendRtcReaction(
          lastSentAtRef.current,
          now,
          RTC_REACTION_SOCKET_CONFIG.minimumSendIntervalMs,
        )
      ) {
        return false;
      }

      const sent =
        transportRef.current?.send(normalizedEmojiId) ?? false;
      if (sent) lastSentAtRef.current = now;
      return sent;
    },
    [role],
  );

  return { status, error, sendReaction };
};
