import { z } from "zod";
import { GetPhotosResponseSchema, UpdateProfileRequestSchema } from "./schema";

export const API_QUERY_KEY = ["users"] as const;

export type ProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;

export type PhotosResponse = z.infer<typeof GetPhotosResponseSchema>;

export interface PaginationParams {
  take?: number;
  cursor?: string;
}
