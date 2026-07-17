import { GoogleLoginRequestSchema } from "./schema";

import { z } from "zod";

export const API_QUERY_KEY = ["auth"] as const;

export type GoogleLoginRequest = z.infer<typeof GoogleLoginRequestSchema>;

export interface GoogleLoginResponse {
  status: SosialLoginStatus;
  accessToken: string;
  userType: UserType;
}

export interface GuestLoginResponse {
  accessToken: string;
  userType: UserType;
}

export type SosialLoginStatus = "LOGIN_SUCCESS" | "NEED_NICKNAME";
export type UserType = "GUEST" | "NORMAL" | "ADMIN";
