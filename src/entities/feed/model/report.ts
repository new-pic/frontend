import { z } from "zod";

export const CONTENT_REPORT_DESCRIPTION_MAX_LENGTH = 500;

export const CONTENT_REPORT_REASONS = [
  "SPAM",
  "HARASSMENT",
  "HATE_SPEECH",
  "INAPPROPRIATE",
  "OTHER",
] as const;

export const ContentReportReasonSchema = z.enum(CONTENT_REPORT_REASONS);

export const CreateContentReportRequestSchema = z.object({
  reason: ContentReportReasonSchema,
  description: z
    .string()
    .trim()
    .max(
      CONTENT_REPORT_DESCRIPTION_MAX_LENGTH,
      `상세 사유는 최대 ${CONTENT_REPORT_DESCRIPTION_MAX_LENGTH}자까지 입력할 수 있습니다.`,
    )
    .transform((description) => description || undefined)
    .optional(),
});

export type ContentReportReason = z.infer<typeof ContentReportReasonSchema>;
export type ContentReportFormValues = z.input<
  typeof CreateContentReportRequestSchema
>;
export type CreateContentReportRequest = z.output<
  typeof CreateContentReportRequestSchema
>;

export type ContentReportTarget =
  { type: "feed"; id: string } | { type: "comment"; id: string };

interface ContentReportResponseBase {
  reported: boolean;
  id: string;
  reason: ContentReportReason;
  description?: string | null;
  createdAt: string;
}

export interface FeedReportResponse extends ContentReportResponseBase {
  feedPostId: string;
}

export interface CommentReportResponse extends ContentReportResponseBase {
  commentId: string;
}

export type ContentReportResponse = FeedReportResponse | CommentReportResponse;
