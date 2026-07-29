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

/**
 * 피드 목록 조회 파라미터
 * @property take - 가져올 피드 개수
 * @property cursor - 가져올 페이지 커서
 * @property tag - 카테고리 목록 (쉼표로 구분)
 * @property q - 검색어
 */
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

export interface NormalizedPoseLandmark {
  index: number;
  x: number;
  y: number;
  visibility?: number;
}

export interface NormalizedPosePerson {
  personIndex: number;
  landmarks: NormalizedPoseLandmark[];
}

export interface NormalizedPoseResult {
  landmarks: NormalizedPoseLandmark[] | NormalizedPosePerson[];
  analysis: {
    poseAnalyzed: boolean;
    posePersonCount: number;
    rawPersonCount: number;
    keypointFormat: "dwpose_xy_score";
    keypointCountsPerPerson: number[];
    scoreCountsPerPerson: number[];
    averageScorePerPerson: number[];
    storageShape: "single_person" | "multi_person";
    truncatedToKeypoints: number;
  };
}

export type FeedPoseLandmark = NormalizedPoseLandmark;
export type FeedPoseAnalysis = NormalizedPoseResult["analysis"];

export interface FeedPoseResponse {
  feedId: string;
  imageUrl: string;
  poseLandmarks: NormalizedPoseResult["landmarks"];
  poseAnalysis: NormalizedPoseResult["analysis"];
  poseUpdatedAt: string;
}

export interface FeedBackgroundRemovalContour {
  contourIndex: number;
  closed: boolean;
  areaRatio: number;
  points: Array<{
    x: number;
    y: number;
  }>;
}

export interface FeedBackgroundRemovalResponse {
  output: {
    success: boolean;
    result: {
      backgroundRemovedImage: string;
      imageWidth: number | null;
      imageHeight: number | null;
      contours: FeedBackgroundRemovalContour[];
    };
  };
}

export interface FeedTagData {
  value: string;
  label: string;
}

export type FeedTagResponse = FeedTagData[];

export type FeedAiJobStatus =
  | "QUEUED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED";

export interface FeedAiJobResponseDto {
  jobId: string;
  feedId: string;
  status: FeedAiJobStatus;
  progressPercent: number;
  estimatedRemainingSeconds: number;
  estimatedCompletedAt: string;
  isCompleted: boolean;
}

export interface FeedAiJobStatusResponseDto {
  status: FeedAiJobStatus;
  progressPercent: number;
  isCompleted: boolean;
}

export interface FeedAiJobProgressEventDto {
  jobId: string;
  status: FeedAiJobStatus;
  progressPercent: number;
  estimatedRemainingSeconds: number;
  isCompleted: boolean;
}
