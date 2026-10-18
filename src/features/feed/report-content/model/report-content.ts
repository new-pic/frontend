import type { ContentReportReason, ContentReportTarget } from "@entities/feed";
import { translate } from "../../../../shared/config";

export const CONTENT_REPORT_REASON_OPTIONS: readonly {
  value: ContentReportReason;
  translationKey:
    | "feed.report.reasons.spam"
    | "feed.report.reasons.harassment"
    | "feed.report.reasons.hateSpeech"
    | "feed.report.reasons.inappropriate"
    | "feed.report.reasons.other";
}[] = [
  { value: "SPAM", translationKey: "feed.report.reasons.spam" },
  { value: "HARASSMENT", translationKey: "feed.report.reasons.harassment" },
  { value: "HATE_SPEECH", translationKey: "feed.report.reasons.hateSpeech" },
  {
    value: "INAPPROPRIATE",
    translationKey: "feed.report.reasons.inappropriate",
  },
  { value: "OTHER", translationKey: "feed.report.reasons.other" },
];

export function canReportContent({
  authorId,
  currentUserId,
}: {
  authorId: string;
  currentUserId: string | null;
}) {
  return currentUserId === null || authorId !== currentUserId;
}

export function getContentReportTargetLabel(target: ContentReportTarget) {
  return target.type === "feed"
    ? translate("feed.report.targetFeed")
    : translate("feed.report.targetComment");
}
