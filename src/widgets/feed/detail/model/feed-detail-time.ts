const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export const FEED_RELATIVE_TIME_WINDOW_MS = 7 * DAY_MS;
export const FEED_UPDATED_TIME_MIN_DELTA_MS = SECOND_MS;

interface FormatFeedDetailTimeParams {
  createdAt: string;
  updatedAt: string;
  now?: number;
}

function parseTimestamp(value: string) {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function formatAbsoluteDate(timestamp: number) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(timestamp);
}

export function formatFeedTimestamp(timestamp: number, now = Date.now()) {
  const elapsed = Math.max(0, now - timestamp);

  if (elapsed < MINUTE_MS) return "방금 전";
  if (elapsed < HOUR_MS) return `${Math.floor(elapsed / MINUTE_MS)}분 전`;
  if (elapsed < DAY_MS) return `${Math.floor(elapsed / HOUR_MS)}시간 전`;
  if (elapsed < FEED_RELATIVE_TIME_WINDOW_MS) {
    return `${Math.floor(elapsed / DAY_MS)}일 전`;
  }
  return formatAbsoluteDate(timestamp);
}

export function formatFeedDetailTime({
  createdAt,
  updatedAt,
  now = Date.now(),
}: FormatFeedDetailTimeParams) {
  const createdTimestamp = parseTimestamp(createdAt);
  const updatedTimestamp = parseTimestamp(updatedAt);
  const labels: string[] = [];

  if (createdTimestamp !== null) {
    labels.push(`업로드 ${formatFeedTimestamp(createdTimestamp, now)}`);
  }

  if (
    updatedTimestamp !== null &&
    createdTimestamp !== null &&
    updatedTimestamp - createdTimestamp >= FEED_UPDATED_TIME_MIN_DELTA_MS
  ) {
    labels.push(`수정 ${formatFeedTimestamp(updatedTimestamp, now)}`);
  }

  return labels.join(" · ");
}
