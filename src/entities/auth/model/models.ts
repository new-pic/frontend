import { GoogleLoginRequestSchema, GoogleLoginResponseSchema } from "./schema";

import { z } from "zod";

export const API_QUERY_KEY = ["auth"] as const;

export type GoogleLoginRequest = z.infer<typeof GoogleLoginRequestSchema>;

export type GoogleLoginResponse = z.infer<typeof GoogleLoginResponseSchema>;

export type GoogleLoginStatus = GoogleLoginResponse["status"];
