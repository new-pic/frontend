import { z } from "zod";

export const GoogleLoginRequestSchema = z.object({
  idToken: z.string(),
});

export const UpdateProfileRequestSchema = z.object({
  nickname: z
    .string()
    .min(1, "닉네임은 최소 1글자 이상이어야 합니다.")
    .max(8, "닉네임은 최대 8글자까지 가능합니다."),
  profileImage: z.string().optional(),
});
