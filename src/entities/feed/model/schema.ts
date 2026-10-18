import { File } from "expo-file-system";
import { z } from "zod";
import { translate } from "../../../shared/config";
// 피드 생성 수정 스키마

const FeedTagsSchema = z
  .array(z.string())
  .min(1, { error: () => translate("feed.validation.tagRequired") })
  .max(3, { error: () => translate("feed.validation.tagMaximum") })
  .refine(
    (value) => {
      const tags = value.map((tag) => tag.trim()).filter(Boolean);
      return new Set(tags).size === tags.length;
    },
    { error: () => translate("feed.validation.tagDuplicate") },
  );

const FeedFormFieldsSchema = z.object({
  image: z.string(),
  imageFileName: z.string().optional(),
  description: z
    .string()
    .trim()
    .min(1, {
      error: () => translate("feed.validation.descriptionRequired"),
    })
    .max(500, {
      error: () => translate("feed.validation.descriptionMaximum"),
    }),
  tags: FeedTagsSchema,
});

export const CreateFeedFormSchema = FeedFormFieldsSchema.extend({
  image: z
    .string()
    .min(1, { error: () => translate("feed.validation.imageRequired") }),
});

export const UpdateFeedFormSchema = FeedFormFieldsSchema;

// 기존 import 호환을 유지하되, 새 작성 폼은 이미지가 필수입니다.
export const FeedFormSchema = CreateFeedFormSchema;

/**
 * 피드 작성 폼 스키마 - 생성/ 수정 공통 transformType
 * @param description - 피드 캡션
 * @param tags - 피드 태그 (쉼표로 구분된 문자열)
 */
const FeedTransformedFormSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, {
      error: () => translate("feed.validation.descriptionRequired"),
    })
    .max(500, {
      error: () => translate("feed.validation.descriptionMaximum"),
    }),
});

/**
 * 피드 작성 요청 스키마
 * @description 공통 폼에서 이미지 추가됨
 * @param image - 피드 이미지
 */
export const CreateFeedRequestSchema = FeedTransformedFormSchema.extend({
  image: z.instanceof(File),
  tags: FeedTagsSchema.transform((tags) =>
    tags
      .map((tag) => tag.trim())
      .filter(Boolean)
      .join(","),
  ),
});

export const UpdateFeedRequestSchema = FeedTransformedFormSchema.extend({
  tags: FeedTagsSchema,
});

export const CreateFeedCommentRequestSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, { error: () => translate("feed.validation.commentRequired") })
    .max(500, { error: () => translate("feed.validation.commentMaximum") }),
});
