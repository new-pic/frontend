import { useAuthStore } from "@shared/model";
import { useRtcStore } from "../model";

const RTC_HOST_ACCESS_TOKEN_HEADER =
  "x-rtc-host-access-token";

export const assertRtcAppAccessToken = (): string => {
  const accessToken =
    useAuthStore.getState().accessToken?.trim() ?? "";

  if (!accessToken) {
    throw new Error("로그인이 필요합니다.");
  }

  return accessToken;
};

const getRtcHostAccessToken = (roomId: string): string => {
  const hostSession = useRtcStore.getState().hostSession;

  if (
    hostSession?.roomId !== roomId ||
    !hostSession.hostAccessToken
  ) {
    throw new Error(
      "RTC 촬영자 인증 토큰이 없습니다. 방을 다시 생성해주세요.",
    );
  }

  return hostSession.hostAccessToken;
};

/**
 * 앱 access token의 존재를 검증하고 현재 방의 HOST 인증 헤더를 만듭니다.
 * Authorization 헤더 자체는 privateApiClient interceptor가 추가합니다.
 */
export const createRtcHostHeaders = (
  roomId: string,
): Record<string, string> => {
  assertRtcAppAccessToken();

  return {
    [RTC_HOST_ACCESS_TOKEN_HEADER]:
      getRtcHostAccessToken(roomId),
  };
};
