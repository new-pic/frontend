import { z } from "zod";
import { translate } from "../../../shared/config";

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
    .max(CONTENT_REPORT_DESCRIPTION_MAX_LENGTH, {
      error: () =>
        translate("feed.report.descriptionMaximum", {
          count: CONTENT_REPORT_DESCRIPTION_MAX_LENGTH,
        }),
    })
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
