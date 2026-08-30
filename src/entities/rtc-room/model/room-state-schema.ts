import { z } from "zod";

export const RtcRoomHostSchema = z
  .object({
    nickname: z.string().trim().min(1),
    profileImage: z.url().nullable(),
  })
  .strict();

export const RtcRoomParticipantSchema = z
  .object({
    nickname: z.string().trim().min(1),
    role: z.string().trim().min(1),
    profileImage: z.url().nullable(),
  })
  .strict();

export const RtcRoomResponseSchema = z
  .object({
    roomId: z.string().trim().min(1),
    status: z.string().trim().min(1),
    expiresAt: z.iso.datetime({ offset: true }),
    host: RtcRoomHostSchema,
    participants: z.array(RtcRoomParticipantSchema),
  })
  .strict();

export const RtcRoomEventPayloadSchema = z
  .object({
    roomId: z.string().trim().min(1),
    status: z.string().trim().min(1).optional(),
    participants: z.array(RtcRoomParticipantSchema).optional(),
    expiresAt: z.iso.datetime({ offset: true }).optional(),
    host: RtcRoomHostSchema.optional(),
  })
  .passthrough();
