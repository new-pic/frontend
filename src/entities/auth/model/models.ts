import { GoogleLoginRequestSchema } from "./schema";

import { z } from "zod";

export const API_QUERY_KEY = ["auth"] as const;

export type GoogleLoginRequest = z.infer<typeof GoogleLoginRequestSchema>;
