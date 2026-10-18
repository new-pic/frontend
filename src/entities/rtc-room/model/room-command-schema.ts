import { File } from "expo-file-system";
import { z } from "zod";
import { translate } from "../../../shared/config";

export const RTC_MAX_CAPTURED_PHOTOS = 100;
export const RTC_MAX_SELECTED_PHOTOS = 20;

export const RtcCreateRoomRequestSchema = z.object({
  expiresInMinutes: z
    .number()
    .min(5, { error: () => translate("rtc.validation.durationMinimum") })
    .max(240, { error: () => translate("rtc.validation.durationMaximum") })
    .optional(),
});

export const RtcJoinRoomRequestSchema = z.object({
  code: z
    .string()
    .regex(/^\d{6}$/, { error: () => translate("rtc.validation.code") }),
});

export const RtcEndRoomRequestSchema = z.object({
  images: z
    .array(z.instanceof(File))
    .max(RTC_MAX_SELECTED_PHOTOS, {
      error: () =>
        translate("rtc.validation.selectedPhotosMaximum", {
          count: RTC_MAX_SELECTED_PHOTOS,
        }),
    })
    .optional(),
});

export const RtcSavedImageSchema = z
  .object({
    id: z.string().trim().min(1),
    url: z.url().startsWith("https://", {
      error: () => translate("rtc.validation.imageHttps"),
    }),
  })
  .strict();

export const RtcEndRoomResponseSchema = z
  .object({
    roomId: z.string().trim().min(1),
    status: z.string().trim().min(1),
    endedAt: z.iso.datetime({ offset: true }),
    savedImages: z.array(RtcSavedImageSchema).max(RTC_MAX_SELECTED_PHOTOS),
  })
  .strict();
