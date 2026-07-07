import { z } from "zod";

export const UpdateProfileRequestSchema = z.object({
  nickname: z
    .string()
    .min(1, "닉네임은 최소 1글자 이상이어야 합니다.")
    .max(8, "닉네임은 최대 8글자까지 가능합니다."),
  profileImage: z.string().optional(),
});

export const GetPhotosResponseSchema = z.array(
  z.object({
    id: z.string(),
    userId: z.string(),
    imageUrl: z.string(),
    mode: z.enum(["SMART_COMPOSITION"]),
    totalScore: z.number().min(0).max(100),
    compositionScore: z.number().min(0).max(100),
    lightingScore: z.number().min(0).max(100),
    poseScore: z.number().min(0).max(100),
    sharpnessScore: z.number().min(0).max(100),
    strengths: z.array(z.string()),
    improvements: z.array(z.string()),
    poseLandmarks: z.any().nullable(),
    poseAnalysis: z.any().nullable(),
    poseUpdatedAt: z.string().nullable(),
    expiresAt: z.string(),
    createdAt: z.string(),
  }),
);
