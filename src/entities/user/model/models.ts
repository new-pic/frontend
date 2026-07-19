import { z } from "zod";
import {
  GetPhotosResponseSchema,
  GoogleLoginRequestSchema,
  UpdateProfileRequestSchema,
} from "./schema";

export const API_QUERY_KEY = ["user"] as const;

export type GoogleLoginRequest = z.infer<typeof GoogleLoginRequestSchema>;

export interface GoogleLoginResponse {
  status: SosialLoginStatus;
  accessToken: string;
  refreshToken: string;
}

export interface GuestLoginResponse {
  accessToken: string;
  refreshToken: string;
}

export type SosialLoginStatus = "LOGIN_SUCCESS" | "NEED_NICKNAME";
export type UserType = "GUEST" | "NORMAL" | "ADMIN";

export type ProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;

export type PhotosResponse = z.infer<typeof GetPhotosResponseSchema>;

export interface PaginationParams {
  take?: number;
  cursor?: string;
}
