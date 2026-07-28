import type {
  CommonJoint,
  CommonPose,
  RawToCaptureTransform,
} from "../model";
import { rawPoseToCaptureNormalized } from "./coordinate-transform";

export const DWPOSE_KEYPOINT_FORMAT = "dwpose_xy_score" as const;

export interface DWPoseLandmark {
  index: number;
  x: number;
  y: number;
  visibility: number;
}

export interface DWPosePoseAdapterOptions {
  keypointFormat: typeof DWPOSE_KEYPOINT_FORMAT;
  coordinateTransform: RawToCaptureTransform;
}

/**
 * The server OpenAPI declares `dwpose_xy_score`. DWPose uses the
 * COCO-WholeBody layout, whose first 17 points are the COCO body joints.
 * Keeping this table explicit prevents accidental MediaPipe index reuse.
 */
const DWPOSE_COCO_WHOLEBODY_INDEX: Record<CommonJoint, number> = {
  NOSE: 0,
  LEFT_SHOULDER: 5,
  RIGHT_SHOULDER: 6,
  LEFT_ELBOW: 7,
  RIGHT_ELBOW: 8,
  LEFT_WRIST: 9,
  RIGHT_WRIST: 10,
  LEFT_HIP: 11,
  RIGHT_HIP: 12,
  LEFT_KNEE: 13,
  RIGHT_KNEE: 14,
  LEFT_ANKLE: 15,
  RIGHT_ANKLE: 16,
};

export function adaptDWPosePose(
  landmarks: readonly DWPoseLandmark[],
  options: DWPosePoseAdapterOptions,
): CommonPose {
  if (options.keypointFormat !== DWPOSE_KEYPOINT_FORMAT) {
    throw new Error(
      `Unsupported DWPose keypoint format: ${options.keypointFormat}`,
    );
  }

  const landmarkByIndex = new Map(
    landmarks.map((landmark) => [landmark.index, landmark]),
  );
  const rawPose: CommonPose = {
    joints: Object.fromEntries(
      Object.entries(DWPOSE_COCO_WHOLEBODY_INDEX).flatMap(
        ([joint, index]) => {
          const landmark = landmarkByIndex.get(index);
          return landmark
            ? [
                [
                  joint,
                  {
                    x: landmark.x,
                    y: landmark.y,
                    confidence: landmark.visibility,
                  },
                ],
              ]
            : [];
        },
      ),
    ),
  };

  return rawPoseToCaptureNormalized(
    rawPose,
    options.coordinateTransform,
  );
}

export function adaptDWPosePoses(
  people: readonly (readonly DWPoseLandmark[])[],
  options: DWPosePoseAdapterOptions,
): CommonPose[] {
  return people.map((landmarks) =>
    adaptDWPosePose(landmarks, options),
  );
}
