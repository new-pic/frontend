import { z } from "zod";
import {
  GoogleLoginRequestSchema,
  GoogleLoginResponseSchema,
  GuestLoginRequestSchema,
  SocialLoginStatusSchema,
  TokenResponseSchema,
  UpdateProfileRequestSchema,
} from "./schema";

export const API_QUERY_KEY = ["user"] as const;

export type GoogleLoginRequest = z.infer<typeof GoogleLoginRequestSchema>;
export type GuestLoginRequest = z.infer<typeof GuestLoginRequestSchema>;

export type TokenResponse = z.infer<typeof TokenResponseSchema>;
export type GoogleLoginResponse = z.infer<typeof GoogleLoginResponseSchema>;

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
