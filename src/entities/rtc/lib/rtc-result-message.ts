import { z } from "zod";
import {
  RtcEndRoomResponseSchema,
  type RtcEndRoomResponse,
} from "../model";

export const RTC_ROOM_ENDED_RPC_METHOD =
  "newpic.rtc.room-ended.v1" as const;
export const RTC_ROOM_ENDED_RPC_ACK =
  "RTC_ROOM_ENDED_ACK" as const;

const RTC_ROOM_ENDED_MESSAGE_VERSION = 1 as const;
const RTC_ROOM_ENDED_MESSAGE_TYPE = "RTC_ROOM_ENDED" as const;
const LIVEKIT_RPC_MAX_PAYLOAD_BYTES = 15 * 1024;

const RtcRoomEndedMessageSchema = z
  .object({
    version: z.literal(RTC_ROOM_ENDED_MESSAGE_VERSION),
    type: z.literal(RTC_ROOM_ENDED_MESSAGE_TYPE),
    result: RtcEndRoomResponseSchema,
  })
  .strict();

/**
 * 방 종료 응답을 LiveKit RPC 문자열 payload로 변환합니다.
 *
 * 유효하지 않은 서버 응답을 publish하지 않도록 encode 시점에도
 * 스키마를 검증하며, 실패하면 ZodError를 throw합니다.
 */
export function encodeRtcRoomEndedRpcPayload(
  result: RtcEndRoomResponse,
): string {
  const message = RtcRoomEndedMessageSchema.parse({
    version: RTC_ROOM_ENDED_MESSAGE_VERSION,
    type: RTC_ROOM_ENDED_MESSAGE_TYPE,
    result,
  });

  const payload = JSON.stringify(message);
  if (
    new TextEncoder().encode(payload).byteLength >
    LIVEKIT_RPC_MAX_PAYLOAD_BYTES
  ) {
    throw new Error(
      "RTC 종료 결과가 LiveKit RPC 최대 크기(15KiB)를 초과했습니다.",
    );
  }

  return payload;
}

/**
 * LiveKit RPC 문자열 payload를 검증된 방 종료 응답으로 복원합니다.
 *
 * 다른 version/type이거나 손상된 JSON, 잘못된 결과 스키마이면
 * 예외를 외부로 전파하지 않고 null을 반환합니다.
 */
export function decodeRtcRoomEndedRpcPayload(
  payload: string,
): RtcEndRoomResponse | null {
  try {
    const message = RtcRoomEndedMessageSchema.safeParse(
      JSON.parse(payload),
    );

    return message.success ? message.data.result : null;
  } catch {
    return null;
  }
}
