import { z } from "zod";

export const GoogleLoginRequestSchema = z.object({
  idToken: z.string(),
  nickname: z.string(),
});
