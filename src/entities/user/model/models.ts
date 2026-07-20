import { z } from "zod";
import {
  GetPhotosResponseSchema,
  GoogleLoginRequestSchema,
  UpdateProfileRequestSchema,
} from "./schema";

export const API_QUERY_KEY = ["user"] as const;

export type GoogleLoginRequest = z.infer<typeof GoogleLoginRequestSchema>;

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}
export interface GoogleLoginResponse extends TokenResponse {
  status: SosialLoginStatus;
}

export type SosialLoginStatus = "LOGIN_SUCCESS" | "NEED_NICKNAME";
export type UserType = "GUEST" | "NORMAL" | "ADMIN";

export type ProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;

export type PhotosResponse = z.infer<typeof GetPhotosResponseSchema>;

export interface PaginationParams {
  take?: number;
  cursor?: string;
}
