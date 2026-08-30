import { z } from "zod";
import {
  RtcRoomEventPayloadSchema,
  RtcRoomHostSchema,
  RtcRoomParticipantSchema,
  RtcRoomResponseSchema,
} from "./room-state-schema";
import {
  RtcCreateRoomRequestSchema,
  RtcEndRoomRequestSchema,
  RtcEndRoomResponseSchema,
  RtcJoinRoomRequestSchema,
  RtcSavedImageSchema,
} from "./room-command-schema";

export type RtcCreateRoomRequest = z.input<typeof RtcCreateRoomRequestSchema>;

export interface RtcCreateRoomResponse {
  roomId: string;
  joinCode: string;
  rtcHostAccessToken: string;
  expiresAt: string;
}

export type RtcRoomHost = z.infer<typeof RtcRoomHostSchema>;

export type RtcRoomParticipant = z.infer<typeof RtcRoomParticipantSchema>;

export type RtcRoomResponse = z.infer<typeof RtcRoomResponseSchema>;

export type RtcRoomEventPayload = z.infer<typeof RtcRoomEventPayloadSchema>;

export type RtcRoomEventType = "snapshot" | "participants" | "status" | "ended";

export type RtcRoomEvent =
  | {
      type: RtcRoomEventType;
      payload: RtcRoomEventPayload;
    }
  | {
      type: "heartbeat";
    };

export type RtcJoinRoomRequest = z.input<typeof RtcJoinRoomRequestSchema>;

export interface RtcJoinRoomResponse {
  roomId: string;
  participantId: string;
}

export type RtcSavedImage = z.infer<typeof RtcSavedImageSchema>;

export type RtcEndRoomResponse = z.infer<typeof RtcEndRoomResponseSchema>;

export type RtcEndRoomRequestInput = z.input<typeof RtcEndRoomRequestSchema>;

export type RtcEndRoomRequest = z.infer<typeof RtcEndRoomRequestSchema>;

export interface RtcEndRoomMutationRequest {
  roomId: string;
  request?: RtcEndRoomRequestInput;
}

export interface RtcLeaveRoomRequest {
  participantId: string;
}

export interface RtcLeaveRoomResponse {
  roomId: string;
  participantId: string;
  status: "LEFT";
  leftAt: string;
}
