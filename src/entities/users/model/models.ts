import z from "zod";
import { GetPhotosResponseSchema, UpdateProfileRequestSchema } from "./schema";

export const API_QUERY_KEY = ["users"] as const;

export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;

export type GetPhotosResponse = z.infer<typeof GetPhotosResponseSchema>;
