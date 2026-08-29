export const RTC_NAVIGATION = {
  paths: {
    camera: "/camera",
    join: "/rtc/join",
    viewer: "/rtc/viewer",
  },
  params: {
    code: "code",
    joinSheet: "joinSheet",
  },
  values: {
    joinSheetOpen: "open",
  },
} as const;

type RtcSearchParamName =
  (typeof RTC_NAVIGATION.params)[keyof typeof RTC_NAVIGATION.params];

export type RtcNavigationSearchParams = Partial<
  Record<RtcSearchParamName, string | string[]>
>;

const createCodeQuery = (code?: string): string =>
  code ? `${RTC_NAVIGATION.params.code}=${encodeURIComponent(code)}` : "";

export const createRtcJoinPath = (code?: string): string => {
  const codeQuery = createCodeQuery(code);

  return codeQuery
    ? `${RTC_NAVIGATION.paths.join}?${codeQuery}`
    : RTC_NAVIGATION.paths.join;
};

export const createCameraJoinPath = (code?: string): string => {
  const codeQuery = createCodeQuery(code);
  const query = [
    `${RTC_NAVIGATION.params.joinSheet}=${RTC_NAVIGATION.values.joinSheetOpen}`,
    codeQuery,
  ]
    .filter(Boolean)
    .join("&");

  return `${RTC_NAVIGATION.paths.camera}?${query}`;
};
