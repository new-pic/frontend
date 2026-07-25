import { File } from "expo-file-system";
import { z } from "zod";

export const RtcCaptureModeSchema = z.enum([
  "SMART_COMPOSITION",
  "REFERENCE_GUIDE",
]);

export const RtcEndRoomRequestSchema = z.object({
  image: z.instanceof(File).optional(),
  images: z
    .array(z.instanceof(File))
    .max(20, "이미지는 최대 20장까지 저장할 수 있습니다.")
    .optional(),
  imageUrl: z.url("올바른 이미지 URL을 입력해주세요.").optional(),
  imageUrls: z
    .array(z.url("올바른 이미지 URL을 입력해주세요."))
    .max(20, "이미지 URL은 최대 20개까지 저장할 수 있습니다.")
    .optional(),
  mode: RtcCaptureModeSchema.optional(),
});
