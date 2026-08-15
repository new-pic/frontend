import type { ContentReportTarget } from "../model";

export function getContentReportPath(target: ContentReportTarget) {
  const targetId = encodeURIComponent(target.id);

  return target.type === "feed"
    ? `/feed/${targetId}/reports`
    : `/feed/comments/${targetId}/reports`;
}
