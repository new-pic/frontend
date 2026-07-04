import z from "zod";
import { FeedResponseSchema } from "./schema";

export const API_QUERY_KEY = ["feed"];

export type FeedResponse = z.infer<typeof FeedResponseSchema>;
