import z from "zod";
import { FeedResponseSchema } from "./schema";

export const API_QUERY_KEY = ["feed"];

export type FeedResponse = z.infer<typeof FeedResponseSchema>;

export interface FeedListParams {
  take?: number;
  cursor?: string;
  tag?: string;
  q?: string;
}

export interface FeedListRequest {
  take?: number;
  cursor?: string;
  category?: string;
  q?: string;
}

export interface FeedListResponse {
  items: FeedResponse[];
  nextCursor?: string;
}

export interface FeedItemResponse {
  id: string;
  shareSlug: string;
  imageUrl: string;
  title: string;
  description: string;
  tags: string[];
  pickCount: number;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    nickname: string;
    profileImage: string;
  };
  isLiked: boolean;
  isPicked: boolean;
}
