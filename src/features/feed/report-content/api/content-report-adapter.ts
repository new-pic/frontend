import type { ContentReportTarget } from "@entities/feed";

export function getContentReportPath(target: ContentReportTarget) {
  const targetId = encodeURIComponent(target.id);

  return target.type === "feed"
    ? `/feed/${targetId}/reports`
    : `/feed/comments/${targetId}/reports`;
}
