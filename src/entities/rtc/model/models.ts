import { z } from "zod";
import {
  RtcCreateRoomRequestSchema,
  RtcEndRoomRequestSchema,
  RtcEndRoomResponseSchema,
  RtcJoinRoomRequestSchema,
  RtcSavedImageSchema,
} from "./schema";
import {
  RtcRoomEventPayloadSchema,
  RtcRoomHostSchema,
  RtcRoomParticipantSchema,
  RtcRoomResponseSchema,
} from "./rtc-room-schema";

export const API_QUERY_KEY = ["rtc"];

export type RtcCreateRoomRequest = z.input<typeof RtcCreateRoomRequestSchema>;

export interface RtcCreateRoomResponse {
  roomId: string;
  joinCode: string;
  rtcHostAccessToken: string;
  expiresAt: string;
}

export type RtcRoomHost = z.infer<typeof RtcRoomHostSchema>;

export type RtcRoomParticipant = z.infer<
  typeof RtcRoomParticipantSchema
>;

export type RtcRoomResponse = z.infer<typeof RtcRoomResponseSchema>;

export type RtcRoomEventPayload = z.infer<
  typeof RtcRoomEventPayloadSchema
>;

export type RtcRoomEventType =
  | "snapshot"
  | "participants"
  | "status"
  | "ended";

export type RtcRoomEvent =
  | {
      type: RtcRoomEventType;
      payload: RtcRoomEventPayload;
    }
  | {
      type: "heartbeat";
    };

export interface RtcHostLiveKitTokenResponse {
  url: string;
  token: string;
  expiresAt: string;
}

export interface RtcHostLiveKitTokenRequest {
  roomId: string;
}

export interface RtcViewerLiveKitTokenResponse {
  url: string;
  token: string;
}

export interface RtcViewerLiveKitTokenRequest {
  roomId: string;
  participantId: string;
}

export type RtcJoinRoomRequest = z.input<typeof RtcJoinRoomRequestSchema>;

export interface RtcJoinRoomResponse {
  roomId: string;
  participantId: string;
}

export interface RtcFeedbackEmoji {
  id: string;
  label: string;
  symbol: string;
}

export interface RtcFeedbackEmojiListResponse {
  items: RtcFeedbackEmoji[];
}

export type RtcSavedImage = z.infer<typeof RtcSavedImageSchema>;

export type RtcEndRoomResponse = z.infer<typeof RtcEndRoomResponseSchema>;

export interface RtcHostSession {
  roomId: string;
  joinCode: string;
  hostAccessToken: string;
  expiresAt: string;
}

export interface RtcViewerSession {
  roomId: string;
  participantId: string;
}

export type RtcLiveKitRole = "HOST" | "VIEWER";

export interface RtcLiveKitConnection {
  role: RtcLiveKitRole;
  url: string;
  token: string;
  expiresAt?: string;
}

export type RtcEndRoomRequestInput = z.input<typeof RtcEndRoomRequestSchema>;

export type RtcEndRoomRequest = z.infer<typeof RtcEndRoomRequestSchema>;

export interface RtcEndRoomMutationRequest {
  roomId: string;
  request?: RtcEndRoomRequestInput;
}
