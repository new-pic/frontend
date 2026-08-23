import { File } from "expo-file-system";
import { z } from "zod";

export const GoogleLoginRequestSchema = z.object({
  idToken: z.string(),
  termsAgreed: z.boolean(),
});

export const AppleLoginRequestSchema = z.object({
  identityToken: z.string().min(1),
  authorizationCode: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  termsAgreed: z.boolean(),
});

export const GuestLoginRequestSchema = z.object({
  deviceId: z.string().min(1),
  termsAgreed: z.boolean(),
});

export const TokenResponseSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  termsAgreed: z.boolean(),
});

export const SocialLoginStatusSchema = z.enum([
  "LOGIN_SUCCESS",
  "NEED_NICKNAME",
  "ACCOUNT_RECOVERED",
]);

export const SocialLoginResponseSchema = TokenResponseSchema.extend({
  status: SocialLoginStatusSchema,
});

export const NicknameSchema = z
  .string()
  .min(1, "닉네임은 최소 1글자 이상이어야 합니다.")
  .max(8, "닉네임은 최대 8글자까지 가능합니다.");

export const UpdateProfileRequestSchema = z.object({
  nickname: NicknameSchema,
  profileImageFile: z.instanceof(File).optional(),
});
