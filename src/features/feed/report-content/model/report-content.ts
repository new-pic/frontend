import type {
  ContentReportReason,
  ContentReportTarget,
} from "@entities/feed";

export const CONTENT_REPORT_REASON_OPTIONS: readonly {
  value: ContentReportReason;
  label: string;
}[] = [
  { value: "SPAM", label: "스팸 또는 광고" },
  { value: "HARASSMENT", label: "괴롭힘 또는 모욕" },
  { value: "HATE_SPEECH", label: "혐오 발언" },
  { value: "INAPPROPRIATE", label: "부적절한 콘텐츠" },
  { value: "OTHER", label: "기타" },
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
  return target.type === "feed" ? "피드" : "댓글";
}
