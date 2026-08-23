import { z } from "zod";
import {
  AppleLoginRequestSchema,
  GoogleLoginRequestSchema,
  GuestLoginRequestSchema,
  SocialLoginResponseSchema,
  SocialLoginStatusSchema,
  TokenResponseSchema,
  UpdateProfileRequestSchema,
} from "./schema";

export const API_QUERY_KEY = ["user"] as const;

export type AppleLoginRequest = z.infer<typeof AppleLoginRequestSchema>;
export type GoogleLoginRequest = z.infer<typeof GoogleLoginRequestSchema>;
export type GuestLoginRequest = z.infer<typeof GuestLoginRequestSchema>;

export type TokenResponse = z.infer<typeof TokenResponseSchema>;
export type SocialLoginResponse = z.infer<typeof SocialLoginResponseSchema>;

export type SosialLoginStatus = z.infer<typeof SocialLoginStatusSchema>;

export type ProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;

export interface UserProfile {
  nickname: string;
  profileImage?: string | null;
}

export interface PaginationParams {
  take?: number;
  cursor?: string;
}
