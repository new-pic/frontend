import { File } from "expo-file-system";
import { z } from "zod";

export const RTC_MAX_CAPTURED_PHOTOS = 100;
export const RTC_MAX_SELECTED_PHOTOS = 20;

export const RtcCreateRoomRequestSchema = z.object({
  expiresInMinutes: z
    .number()
    .min(5, "방 사용 시간은 최소 5분입니다.")
    .max(240, "방 사용 시간은 최대 240분입니다.")
    .optional(),
});

export const RtcJoinRoomRequestSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "참여 코드는 6자리 숫자여야 합니다."),
});

export const RtcEndRoomRequestSchema = z.object({
  images: z
    .array(z.instanceof(File))
    .max(
      RTC_MAX_SELECTED_PHOTOS,
      `방 종료 시 사진은 최대 ${RTC_MAX_SELECTED_PHOTOS}장까지 저장할 수 있습니다.`,
    )
    .optional(),
});

export const RtcSavedImageSchema = z
  .object({
    id: z.string().trim().min(1),
    url: z
      .url()
      .startsWith("https://", "저장된 RTC 이미지 URL은 HTTPS여야 합니다."),
  })
  .strict();

export const RtcEndRoomResponseSchema = z
  .object({
    roomId: z.string().trim().min(1),
    status: z.string().trim().min(1),
    endedAt: z.iso.datetime({ offset: true }),
    savedImages: z
      .array(RtcSavedImageSchema)
      .max(RTC_MAX_SELECTED_PHOTOS),
  })
  .strict();
