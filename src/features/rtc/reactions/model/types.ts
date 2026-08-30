export interface RtcReactionEmoji {
  id: string;
  label: string;
  symbol: string;
}

export interface RtcFeedbackEmojiListResponse {
  items: RtcReactionEmoji[];
}

export interface RtcReceivedReaction {
  emojiId: string;
}

export interface RtcReactionBubble {
  renderId: string;
  emojiId: string;
  symbol: string;
  lane: number;
}

export type RtcReactionRole = "HOST" | "VIEWER";

export interface RtcReactionHostJoinPayload {
  roomId: string;
}

export interface RtcReactionViewerJoinPayload {
  roomId: string;
  participantId: string;
}

export interface RtcReactionJoinResponse {
  ok: boolean;
  message?: string;
}

export type RtcReactionConnectionStatus =
  "IDLE" | "CONNECTING" | "CONNECTED" | "DISCONNECTED" | "ERROR";

export interface RtcReactionChannel {
  status: RtcReactionConnectionStatus;
  error: string | null;
  sendReaction: (emojiId: string) => boolean;
}
