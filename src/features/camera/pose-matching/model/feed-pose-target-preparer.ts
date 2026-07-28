import type { FeedPoseResponse } from "@entities/feed";
import { resolveFeedCameraAspectRatio } from "../../capture-photo/lib/feed-camera-aspect-ratio";
import { adaptDWPoseResult } from "../lib/dwpose-pose-adapter";
import type {
  CoordinateSize,
  DWPoseSourcePose,
} from "./types";

export interface FeedPoseTargetSelection {
  feedId: string;
  imageUrl: string;
}

export interface LoadedFeedReferenceImage<TImage> {
  image: TImage;
  size: CoordinateSize;
}

export interface PreparedFeedPoseTarget<TImage> {
  feedId: string;
  imageUrl: string;
  image: TImage;
  sourceSize: CoordinateSize;
  cameraAspectRatio: "4:3" | "16:9";
  sourcePoses: DWPoseSourcePose[];
  poseUpdatedAt: string;
}

export type FeedPoseTargetPreparation<TImage> =
  | {
      status: "committed";
      target: PreparedFeedPoseTarget<TImage>;
    }
  | {
      status: "stale";
      target: null;
    };

export interface FeedPoseTargetPreparerDependencies<TImage> {
  loadPose: (feedId: string) => Promise<FeedPoseResponse>;
  loadImage: (
    imageUrl: string,
  ) => Promise<LoadedFeedReferenceImage<TImage>>;
}

/**
 * Keeps the current target active while a newly selected Feed is prepared.
 * Only the latest completed selection can atomically replace the active
 * target; stale completions and failures never clear the current target.
 */
export function createFeedPoseTargetPreparer<TImage>({
  loadPose,
  loadImage,
}: FeedPoseTargetPreparerDependencies<TImage>) {
  let latestRequestId = 0;
  let activeTarget: PreparedFeedPoseTarget<TImage> | null = null;

  return {
    getActiveTarget() {
      return activeTarget;
    },

    cancelPending() {
      latestRequestId += 1;
    },

    async prepare(
      selection: FeedPoseTargetSelection,
    ): Promise<FeedPoseTargetPreparation<TImage>> {
      const requestId = ++latestRequestId;
      const [poseResponse, selectedImage] = await Promise.all([
        loadPose(selection.feedId),
        loadImage(selection.imageUrl),
      ]);
      const referenceImage =
        poseResponse.imageUrl === selection.imageUrl
          ? selectedImage
          : await loadImage(poseResponse.imageUrl);

      if (requestId !== latestRequestId) {
        return { status: "stale", target: null };
      }

      const sourcePoses = adaptDWPoseResult({
        landmarks: poseResponse.poseLandmarks,
        analysis: poseResponse.poseAnalysis,
      });
      const target: PreparedFeedPoseTarget<TImage> = {
        feedId: poseResponse.feedId,
        imageUrl: poseResponse.imageUrl,
        image: referenceImage.image,
        sourceSize: referenceImage.size,
        cameraAspectRatio: resolveFeedCameraAspectRatio(
          referenceImage.size,
        ),
        sourcePoses,
        poseUpdatedAt: poseResponse.poseUpdatedAt,
      };

      activeTarget = target;
      return { status: "committed", target };
    },
  };
}
