import { RTC_REACTION_SOCKET_CONFIG } from "../config/rtc-reaction-config";
import type {
  RtcReactionHostJoinPayload,
  RtcReactionJoinResponse,
  RtcReactionRole,
  RtcReactionViewerJoinPayload,
} from "../model/types";

export function createRtcReactionHostJoinPayload(
  roomId: string,
): RtcReactionHostJoinPayload {
  return { roomId: roomId.trim() };
}

export function createRtcReactionViewerJoinPayload(
  roomId: string,
  participantId: string,
): RtcReactionViewerJoinPayload {
  return {
    roomId: roomId.trim(),
    participantId: participantId.trim(),
  };
}

export function getRtcReactionJoinEvent(role: RtcReactionRole) {
  return role === "HOST"
    ? RTC_REACTION_SOCKET_CONFIG.hostJoinEvent
    : RTC_REACTION_SOCKET_CONFIG.viewerJoinEvent;
}

export function getRtcReactionJoinRetryDelay(retryAttempt: number): number {
  return Math.min(
    RTC_REACTION_SOCKET_CONFIG.joinRetryBaseDelayMs *
      2 ** Math.max(0, retryAttempt),
    RTC_REACTION_SOCKET_CONFIG.joinRetryMaxDelayMs,
  );
}

export function isRtcReactionJoinSuccess(
  response: RtcReactionJoinResponse | undefined,
): boolean {
  return response?.ok === true;
}
