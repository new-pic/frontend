import { translate } from "../../../../shared/config";

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
  language?: string;
}

function parseTimestamp(value: string) {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function formatAbsoluteDate(timestamp: number, language: string) {
  return new Intl.DateTimeFormat(language, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(timestamp);
}

export function formatFeedTimestamp(
  timestamp: number,
  now = Date.now(),
  language = "ko",
) {
  const elapsed = Math.max(0, now - timestamp);

  if (elapsed < MINUTE_MS) {
    return translate("feed.time.justNow", { lng: language });
  }
  if (elapsed < HOUR_MS) {
    return translate("feed.time.minutesAgo", {
      count: Math.floor(elapsed / MINUTE_MS),
      lng: language,
    });
  }
  if (elapsed < DAY_MS) {
    return translate("feed.time.hoursAgo", {
      count: Math.floor(elapsed / HOUR_MS),
      lng: language,
    });
  }
  if (elapsed < FEED_RELATIVE_TIME_WINDOW_MS) {
    return translate("feed.time.daysAgo", {
      count: Math.floor(elapsed / DAY_MS),
      lng: language,
    });
  }
  return formatAbsoluteDate(timestamp, language);
}

export function formatFeedDetailTime({
  createdAt,
  updatedAt,
  now = Date.now(),
  language = "ko",
}: FormatFeedDetailTimeParams) {
  const createdTimestamp = parseTimestamp(createdAt);
  const updatedTimestamp = parseTimestamp(updatedAt);
  const labels: string[] = [];

  if (createdTimestamp !== null) {
    labels.push(
      translate("feed.time.uploaded", {
        time: formatFeedTimestamp(createdTimestamp, now, language),
        lng: language,
      }),
    );
  }

  if (
    updatedTimestamp !== null &&
    createdTimestamp !== null &&
    updatedTimestamp - createdTimestamp >= FEED_UPDATED_TIME_MIN_DELTA_MS
  ) {
    labels.push(
      translate("feed.time.edited", {
        time: formatFeedTimestamp(updatedTimestamp, now, language),
        lng: language,
      }),
    );
  }

  return labels.join(" · ");
}
