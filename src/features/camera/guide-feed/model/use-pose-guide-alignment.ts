import { useCallback, useEffect, useRef, useState } from "react";
import type { PoseSceneMatchResult } from "./pose-types";
import {
  advancePoseGuideAlignmentClock,
  advancePoseGuideAlignmentPolicy,
  createPoseGuideAlignmentPolicyState,
  resetPoseGuideAlignmentPolicy,
  resetPoseGuideAlignmentTracking,
  toPoseGuideAlignmentSnapshot,
  type PoseGuideAlignmentSnapshot,
} from "./pose-guide-alignment-policy";
import { DEFAULT_POSE_GUIDE_FEEDBACK_CONFIG } from "./pose-guide-feedback-config";

interface UsePoseGuideAlignmentOptions {
  guideId: string | null;
  targetReady: boolean;
  enabled: boolean;
}

interface PoseGuideAlignmentObservation {
  result: PoseSceneMatchResult;
  targetPersonCount: number;
  livePersonCount: number;
}

function isSameSnapshot(
  left: PoseGuideAlignmentSnapshot,
  right: PoseGuideAlignmentSnapshot,
) {
  return (
    left.guideId === right.guideId &&
    left.active === right.active &&
    left.alignmentState === right.alignmentState &&
    left.feedback?.reason === right.feedback?.reason &&
    left.feedback?.personPosition === right.feedback?.personPosition &&
    left.feedback?.targetPersonCount === right.feedback?.targetPersonCount &&
    left.feedback?.livePersonCount === right.feedback?.livePersonCount
  );
}

export function usePoseGuideAlignment({
  guideId,
  targetReady,
  enabled,
}: UsePoseGuideAlignmentOptions) {
  const identityRef = useRef({ guideId, targetReady, enabled });
  const noFrameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const policyRef = useRef(
    createPoseGuideAlignmentPolicyState(guideId, targetReady),
  );
  const [snapshot, setSnapshot] = useState(() =>
    toPoseGuideAlignmentSnapshot(
      createPoseGuideAlignmentPolicyState(guideId, targetReady),
    ),
  );
  const publishedSnapshotRef = useRef(snapshot);

  const publish = useCallback(
    (nextSnapshot: PoseGuideAlignmentSnapshot, force = false) => {
      if (
        force ||
        !isSameSnapshot(publishedSnapshotRef.current, nextSnapshot)
      ) {
        publishedSnapshotRef.current = nextSnapshot;
        setSnapshot(nextSnapshot);
      }
    },
    [],
  );

  const clearNoFrameTimer = useCallback(() => {
    if (noFrameTimerRef.current !== null) {
      clearTimeout(noFrameTimerRef.current);
      noFrameTimerRef.current = null;
    }
  }, []);

  const resetTracking = useCallback(() => {
    clearNoFrameTimer();
    const shouldPublishScoreReset =
      policyRef.current.smoothedOverallScore !== null;
    policyRef.current = resetPoseGuideAlignmentTracking(policyRef.current);
    publish(
      toPoseGuideAlignmentSnapshot(policyRef.current),
      shouldPublishScoreReset,
    );
  }, [clearNoFrameTimer, publish]);

  useEffect(() => {
    identityRef.current = { guideId, targetReady, enabled };
    policyRef.current = resetPoseGuideAlignmentPolicy(
      policyRef.current,
      guideId,
      targetReady,
    );
    if (!enabled) {
      policyRef.current = resetPoseGuideAlignmentTracking(policyRef.current);
    }
    const nextSnapshot = toPoseGuideAlignmentSnapshot(policyRef.current);
    publish(nextSnapshot);
    clearNoFrameTimer();
  }, [clearNoFrameTimer, enabled, guideId, publish, targetReady]);

  useEffect(() => clearNoFrameTimer, [clearNoFrameTimer]);

  const observe = useCallback(
    ({
      result,
      targetPersonCount,
      livePersonCount,
    }: PoseGuideAlignmentObservation) => {
      const identity = identityRef.current;
      if (!identity.enabled) return;

      const nowMs = Date.now();
      policyRef.current = resetPoseGuideAlignmentPolicy(
        policyRef.current,
        identity.guideId,
        identity.targetReady,
      );
      policyRef.current = advancePoseGuideAlignmentPolicy(policyRef.current, {
        result,
        targetPersonCount,
        livePersonCount,
        nowMs,
      });

      const nextSnapshot = toPoseGuideAlignmentSnapshot(policyRef.current);
      publish(nextSnapshot);

      clearNoFrameTimer();
      const noFrameDeadlineMs =
        nowMs + DEFAULT_POSE_GUIDE_FEEDBACK_CONFIG.noFrameTimeoutMs;
      noFrameTimerRef.current = setTimeout(() => {
        policyRef.current = advancePoseGuideAlignmentClock(
          policyRef.current,
          Math.max(Date.now(), noFrameDeadlineMs),
        );
        publish(toPoseGuideAlignmentSnapshot(policyRef.current), true);
        noFrameTimerRef.current = null;
      }, DEFAULT_POSE_GUIDE_FEEDBACK_CONFIG.noFrameTimeoutMs);
    },
    [clearNoFrameTimer, publish],
  );

  const visibleSnapshot =
    targetReady &&
    snapshot.guideId === guideId &&
    snapshot.active === (guideId !== null)
      ? snapshot
      : toPoseGuideAlignmentSnapshot(
          createPoseGuideAlignmentPolicyState(guideId, targetReady),
        );

  return {
    snapshot: visibleSnapshot,
    observe,
    resetTracking,
  };
}
