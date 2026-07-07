import z from "zod";
import { UpdateProfileRequestSchema } from "./schema";

export const API_QUERY_KEY = ["auth"] as const;

export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;
