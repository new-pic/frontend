import { z } from "zod";

export const FeedResponseSchema = z.object({
  id: z.string(),
  imageUrl: z.string(),
});
