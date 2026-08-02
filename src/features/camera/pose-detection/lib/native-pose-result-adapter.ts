import type { NativeDetectedPoseFrame } from "@newpic/vision-camera-pose";
import type { DetectedPoseFrame } from "../model/types";

const QUARTER_TURNS = [0, 90, 180, 270] as const;

function toQuarterTurn(value: number) {
  return (
    QUARTER_TURNS.find((candidate) => candidate === value) ?? 0
  );
}

export function adaptNativeDetectedPoseFrame(
  frame: NativeDetectedPoseFrame,
): DetectedPoseFrame {
  return {
    timestamp: frame.timestamp,
    poses: frame.poses.map((pose) => ({
      landmarks: pose.landmarks.map((landmark) => ({
        x: landmark.x,
        y: landmark.y,
        z: landmark.z,
        confidence: landmark.confidence,
      })),
    })),
    inputSize: {
      width: frame.inputWidth,
      height: frame.inputHeight,
    },
    sourceFrame: {
      width: frame.sourceWidth,
      height: frame.sourceHeight,
      rotationDegrees: toQuarterTurn(
        frame.rotationDegrees,
      ),
      isMirrored: frame.isMirrored,
    },
  };
}
