import {
  COMMON_JOINTS,
  type CommonJoint,
  type CommonPose,
  type CommonPosePoint,
  type PoseBoundingBox,
  type PoseJointGroup,
  type PosePairMatch,
} from "./types";
import type { PoseMatchConfig } from "./pose-match-config";

const EMPTY_SCORE = {
  overall: 0,
  position: 0,
  scale: 0,
  pose: 0,
};

function clampScore(score: number) {
  return Math.max(0, Math.min(100, score));
}

function scoreError(error: number, tolerance: number) {
  if (!Number.isFinite(error) || tolerance <= 0) return 0;
  return clampScore(100 * Math.exp(-0.5 * (error / tolerance) ** 2));
}

function distance(
  first: { x: number; y: number },
  second: { x: number; y: number },
) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function isUsablePoint(
  point: CommonPosePoint | undefined,
  config: PoseMatchConfig,
): point is CommonPosePoint {
  if (
    !point ||
    !Number.isFinite(point.x) ||
    !Number.isFinite(point.y) ||
    !Number.isFinite(point.confidence) ||
    point.confidence < config.minConfidence
  ) {
    return false;
  }

  return (
    !config.excludeOutsideCapture ||
    (point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1)
  );
}

export function getPoseBoundingBox(
  pose: CommonPose,
  config: PoseMatchConfig,
): PoseBoundingBox | null {
  const points = COMMON_JOINTS.map((joint) => pose.joints[joint]).filter(
    (point) => isUsablePoint(point, config),
  );

  if (points.length === 0) return null;

  const minX = Math.min(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxX = Math.max(...points.map((point) => point.x));
  const maxY = Math.max(...points.map((point) => point.y));
  const width = maxX - minX;
  const height = maxY - minY;

  return {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
    area: width * height,
    center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
  };
}

function averagePoints(points: CommonPosePoint[]) {
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  };
}

function getBodyCenter(
  pose: CommonPose,
  boundingBox: PoseBoundingBox,
  config: PoseMatchConfig,
) {
  const torsoPoints = [
    pose.joints.LEFT_SHOULDER,
    pose.joints.RIGHT_SHOULDER,
    pose.joints.LEFT_HIP,
    pose.joints.RIGHT_HIP,
  ].filter((point) => isUsablePoint(point, config));

  return torsoPoints.length >= 2
    ? averagePoints(torsoPoints)
    : boundingBox.center;
}

function getPairMidpoint(
  pose: CommonPose,
  leftJoint: CommonJoint,
  rightJoint: CommonJoint,
  config: PoseMatchConfig,
) {
  const left = pose.joints[leftJoint];
  const right = pose.joints[rightJoint];

  return isUsablePoint(left, config) && isUsablePoint(right, config)
    ? averagePoints([left, right])
    : null;
}

function getBodyScale(
  pose: CommonPose,
  boundingBox: PoseBoundingBox,
  config: PoseMatchConfig,
) {
  const measurements: number[] = [];
  const leftShoulder = pose.joints.LEFT_SHOULDER;
  const rightShoulder = pose.joints.RIGHT_SHOULDER;
  const leftHip = pose.joints.LEFT_HIP;
  const rightHip = pose.joints.RIGHT_HIP;

  if (
    isUsablePoint(leftShoulder, config) &&
    isUsablePoint(rightShoulder, config)
  ) {
    measurements.push(distance(leftShoulder, rightShoulder));
  }
  if (isUsablePoint(leftHip, config) && isUsablePoint(rightHip, config)) {
    measurements.push(distance(leftHip, rightHip));
  }

  const shoulderCenter = getPairMidpoint(
    pose,
    "LEFT_SHOULDER",
    "RIGHT_SHOULDER",
    config,
  );
  const hipCenter = getPairMidpoint(pose, "LEFT_HIP", "RIGHT_HIP", config);
  if (shoulderCenter && hipCenter) {
    measurements.push(distance(shoulderCenter, hipCenter));
  }

  const positiveMeasurements = measurements.filter(
    (measurement) => measurement > 0,
  );
  if (positiveMeasurements.length > 0) {
    return (
      positiveMeasurements.reduce((sum, measurement) => sum + measurement, 0) /
      positiveMeasurements.length
    );
  }

  return Math.max(
    Math.hypot(boundingBox.width, boundingBox.height),
    Number.EPSILON,
  );
}

function getComparableJointErrors(
  target: CommonPose,
  live: CommonPose,
  targetCenter: { x: number; y: number },
  liveCenter: { x: number; y: number },
  targetBodyScale: number,
  liveBodyScale: number,
  config: PoseMatchConfig,
) {
  const errors: Partial<Record<CommonJoint, number>> = {};

  for (const joint of COMMON_JOINTS) {
    const targetPoint = target.joints[joint];
    const livePoint = live.joints[joint];
    if (
      !isUsablePoint(targetPoint, config) ||
      !isUsablePoint(livePoint, config)
    ) {
      continue;
    }

    const normalizedTarget = {
      x: (targetPoint.x - targetCenter.x) / targetBodyScale,
      y: (targetPoint.y - targetCenter.y) / targetBodyScale,
    };
    const normalizedLive = {
      x: (livePoint.x - liveCenter.x) / liveBodyScale,
      y: (livePoint.y - liveCenter.y) / liveBodyScale,
    };
    errors[joint] = distance(normalizedTarget, normalizedLive);
  }

  return errors;
}

function getJointGroupScores(
  jointErrors: Partial<Record<CommonJoint, number>>,
  config: PoseMatchConfig,
) {
  const scores: Partial<Record<PoseJointGroup, number>> = {};

  for (const [group, joints] of Object.entries(config.jointGroups) as [
    PoseJointGroup,
    readonly CommonJoint[],
  ][]) {
    const errors = joints
      .map((joint) => jointErrors[joint])
      .filter((error): error is number => error !== undefined);
    if (errors.length < 2) continue;

    scores[group] =
      errors.reduce(
        (sum, error) => sum + scoreError(error, config.poseJointTolerance),
        0,
      ) / errors.length;
  }

  return scores;
}

function getWeightedPoseScore(
  groupScores: Partial<Record<PoseJointGroup, number>>,
  config: PoseMatchConfig,
) {
  let weightedScore = 0;
  let totalWeight = 0;

  for (const [group, score] of Object.entries(groupScores) as [
    PoseJointGroup,
    number,
  ][]) {
    const weight = config.jointGroupWeights[group];
    weightedScore += score * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? weightedScore / totalWeight : 0;
}

export function matchPosePair(
  target: CommonPose,
  live: CommonPose,
  config: PoseMatchConfig,
): PosePairMatch {
  const targetBoundingBox = getPoseBoundingBox(target, config);
  const liveBoundingBox = getPoseBoundingBox(live, config);

  if (
    !targetBoundingBox ||
    !liveBoundingBox ||
    targetBoundingBox.area <= 0 ||
    liveBoundingBox.area <= 0
  ) {
    return {
      score: EMPTY_SCORE,
      metrics: null,
      isComparable: false,
      isAligned: false,
    };
  }

  const targetCenter = getBodyCenter(target, targetBoundingBox, config);
  const liveCenter = getBodyCenter(live, liveBoundingBox, config);
  const centerDelta = {
    x: liveCenter.x - targetCenter.x,
    y: liveCenter.y - targetCenter.y,
  };
  const centerDistance = Math.hypot(centerDelta.x, centerDelta.y);
  const scaleRatio = Math.sqrt(liveBoundingBox.area / targetBoundingBox.area);
  const targetBodyScale = getBodyScale(target, targetBoundingBox, config);
  const liveBodyScale = getBodyScale(live, liveBoundingBox, config);
  const jointErrors = getComparableJointErrors(
    target,
    live,
    targetCenter,
    liveCenter,
    targetBodyScale,
    liveBodyScale,
    config,
  );
  const comparableJointCount = Object.keys(jointErrors).length;
  const jointGroupScores = getJointGroupScores(jointErrors, config);
  const isComparable = comparableJointCount >= config.minimumComparableJoints;
  const position = scoreError(centerDistance, config.positionTolerance);
  const scale = scoreError(
    Math.abs(Math.log(scaleRatio)),
    config.scaleLogTolerance,
  );
  const pose = isComparable
    ? getWeightedPoseScore(jointGroupScores, config)
    : 0;
  const overall = isComparable
    ? clampScore(
        position * config.scoreWeights.position +
          scale * config.scoreWeights.scale +
          pose * config.scoreWeights.pose,
      )
    : 0;
  const comparableGroupScores = Object.values(jointGroupScores);
  const groupsAligned =
    comparableGroupScores.length > 0 &&
    comparableGroupScores.every(
      (score) => score >= config.minimumJointGroupScore,
    );
  const isAligned =
    isComparable &&
    overall >= config.personAlignmentThreshold &&
    position >= config.minimumPositionScore &&
    scale >= config.minimumScaleScore &&
    pose >= config.minimumPoseScore &&
    groupsAligned;

  return {
    score: { overall, position, scale, pose },
    metrics: {
      targetCenter,
      liveCenter,
      centerDelta,
      centerDistance,
      targetBoundingBox,
      liveBoundingBox,
      scaleRatio,
      comparableJointCount,
      jointErrors,
      jointGroupScores,
    },
    isComparable,
    isAligned,
  };
}
