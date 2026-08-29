import { z } from "zod";

export const RTC_STORED_PHOTO_MAX_TAKE = 50;

export const RtcStoredPhotoSchema = z.object({
  id: z.string().trim().min(1),
  imageUrl: z.url().startsWith("https://"),
  roomId: z.string().trim().min(1),
  createdAt: z.iso.datetime({ offset: true }),
  expiresAt: z.iso.datetime({ offset: true }),
});

export const RtcStoredPhotoListParamsSchema = z.object({
  take: z.number().int().min(1).max(RTC_STORED_PHOTO_MAX_TAKE).optional(),
  cursor: z.string().trim().min(1).optional(),
});

export const RtcStoredPhotoListResponseSchema = z.object({
  items: z.array(RtcStoredPhotoSchema).max(RTC_STORED_PHOTO_MAX_TAKE),
  nextCursor: z.string().trim().min(1).nullable().optional().default(null),
});
