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

export type AppleLoginRequest = z.infer<typeof AppleLoginRequestSchema>;
export type GoogleLoginRequest = z.infer<typeof GoogleLoginRequestSchema>;
export type GuestLoginRequest = z.infer<typeof GuestLoginRequestSchema>;
export type TokenResponse = z.infer<typeof TokenResponseSchema>;
export type SocialLoginResponse = z.infer<typeof SocialLoginResponseSchema>;
