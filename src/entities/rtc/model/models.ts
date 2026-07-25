import { z } from "zod";
import {
  RtcCaptureModeSchema,
  RtcEndRoomRequestSchema,
} from "./schema";

export const API_QUERY_KEY = ["rtc"];

/**
 * RTC 방 생성 요청
 * @property code - 방 코드
 * @property displayName - 참여자 이름
 * @property isGuest - 비회원 여부
 */
export interface RtcJoinRoomRequest {
  code: string;
  displayName: string;
  isGuest?: boolean;
}

export type RtcCaptureMode = z.infer<typeof RtcCaptureModeSchema>;

export type RtcEndRoomRequestInput = z.input<
  typeof RtcEndRoomRequestSchema
>;

export type RtcEndRoomRequest = z.infer<typeof RtcEndRoomRequestSchema>;
