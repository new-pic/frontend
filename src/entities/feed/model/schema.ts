import { File } from "expo-file-system";
import { z } from "zod";

export const FeedResponseSchema = z.object({
  id: z.string(),
  imageUrl: z.string(),
  fileName: z.string().optional(),
});

// 피드 생성 수정 스키마

const FeedTagsSchema = z
  .array(z.string())
  .min(1, "최소 하나의 태그를 입력해주세요.")
  .max(3, "최대 3개의 태그만 입력 가능합니다.")
  .refine(
    (value) => {
      const tags = value.map((tag) => tag.trim()).filter(Boolean);
      return new Set(tags).size === tags.length;
    },
    { message: "중복된 태그가 존재합니다." },
  );

export const FeedFormSchema = z.object({
  image: z.string(),
  imageFileName: z.string().optional(),
  description: z.string().max(500),
  tags: FeedTagsSchema,
});

/**
 * 피드 작성 폼 스키마 - 생성/ 수정 공통 transformType
 * @param description - 피드 캡션
 * @param tags - 피드 태그 (쉼표로 구분된 문자열)
 */
const FeedTransformedFormSchema = z.object({
  description: z.string().max(500),
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
