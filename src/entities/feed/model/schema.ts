import { z } from "zod";

export const FeedResponseSchema = z.object({
  id: z.string(),
  imageUrl: z.string(),
});

// 피드 생성 수정 스키마

/**
 * 피드 작성 폼 스키마 - 생성/ 수정 공통
 * @param description - 피드 캡션
 * @param tags - 피드 태그 (쉼표로 구분된 문자열)
 */
const FeedFormSchema = z.object({
  description: z.string().max(500),
  tags: z
    .string()
    .transform((value) =>
      value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    )
    .refine((tags) => tags.length <= 5, {
      message: "태그는 최대 5개까지만 등록 가능합니다.",
    })
    .refine((tags) => new Set(tags).size === tags.length, {
      message: "중복된 태그가 존재합니다.",
    })
    .nullable()
    .optional(),
});

/**
 * 피드 작성 요청 스키마
 * @description 공통 폼에서 이미지 추가됨
 * @param image - 피드 이미지
 */
export const CreateFeedRequestSchema = FeedFormSchema.extend({
  image: z.file({ error: "업로드할 이미지를 선택해주세요." }),
});

export const UpdateFeedRequestSchema = FeedFormSchema;
