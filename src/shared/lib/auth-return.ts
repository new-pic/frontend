export type SearchParamValue = string | string[] | undefined;

export const getFirstSearchParam = (
  value: SearchParamValue,
): string | undefined => (Array.isArray(value) ? value[0] : value);

/**
 * 로그인 완료 후 앱 내부 경로로만 복귀하도록 외부 URL과 루트 재귀를
 * 차단합니다.
 */
export const normalizeAuthReturnTo = (
  value: SearchParamValue,
  fallback = "/feed",
): string => {
  const returnTo = getFirstSearchParam(value)?.trim();

  if (
    !returnTo ||
    !returnTo.startsWith("/") ||
    returnTo.startsWith("//") ||
    returnTo === "/" ||
    returnTo.startsWith("/?")
  ) {
    return fallback;
  }

  return returnTo;
};
