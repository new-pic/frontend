import { z } from "zod";

export const GoogleLoginRequestSchema = z.object({
  idToken: z.string(),
});

// 기존 사용자 로그인 성공 시, LOGIN_SUCCESS 반환
// 신규 사용자 로그인 시, NEED_NICKNAME 반환
const GoogleLoginStatusSchema = z.enum(["LOGIN_SUCCESS", "NEED_NICKNAME"]);

export const GoogleLoginResponseSchema = z.object({
  status: GoogleLoginStatusSchema,
  accessToken: z.string(),
});
