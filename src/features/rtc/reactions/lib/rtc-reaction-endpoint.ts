export const getRtcReactionServerUrl = (apiUrl: string): string => {
  const normalizedApiUrl = apiUrl.trim();
  if (!normalizedApiUrl) {
    throw new Error("RTC 반응 서버 주소가 설정되지 않았습니다.");
  }

  try {
    return new URL(normalizedApiUrl).origin;
  } catch {
    throw new Error("RTC 반응 서버 주소가 올바르지 않습니다.");
  }
};
