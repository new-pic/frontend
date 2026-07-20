import z from "zod";
import {
  CreateFeedCommentRequestSchema,
  CreateFeedRequestSchema,
  FeedFormSchema,
  UpdateFeedRequestSchema,
} from "./schema";

export const API_QUERY_KEY = ["feed"];

export type CreateFeedRequestInput = z.input<typeof CreateFeedRequestSchema>;
export type UpdateFeedRequestInput = z.input<typeof UpdateFeedRequestSchema>;

export type CreateFeedRequest = z.infer<typeof CreateFeedRequestSchema>;
export type UpdateFeedRequest = z.infer<typeof UpdateFeedRequestSchema>;
export type FeedFormValues = z.infer<typeof FeedFormSchema>;
export type CreateFeedCommentRequest = z.infer<
  typeof CreateFeedCommentRequestSchema
>;

export interface FeedListParams {
  take?: number;
  cursor?: string;
  tag?: string;
  q?: string;
}

export interface CommentListParams {
  take?: number;
  cursor?: string;
  feedId: string;
  sort?: "oldest" | "latest";
}

export interface FeedCommentResponse {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    nickname: string;
    profileImage: string;
  };
}

export interface CommentListResponse {
  items: FeedCommentResponse[];
  nextCursor?: string | null;
}

export interface FeedListRequest {
  take?: number;
  cursor?: string;
  category?: string;
  q?: string;
}

export interface FeedResponse {
  id: string;
  shareSlug: string;
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
  detailImageUrl: string;
  thumbnailUrl: string;
}

export interface FeedListResponse {
  items: FeedResponse[];
  nextCursor?: string | null;
}

export interface FeedItemResponse {
  id: string;
  shareSlug: string;
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
  detailImageUrl: string;
  thumbnailUrl: string;
}

export interface FeedTagData {
  value: string;
  label: string;
}

export type FeedTagResponse = FeedTagData[];
