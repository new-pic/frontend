import { useCallback, useEffect, useRef, useState } from "react";
import type { PoseSceneMatchResult } from "../lib/pose-matching";
import {
  advancePoseGuideAlignmentPolicy,
  createPoseGuideAlignmentPolicyState,
  resetPoseGuideAlignmentPolicy,
  toPoseGuideAlignmentSnapshot,
  type PoseGuideAlignmentSnapshot,
} from "./pose-guide-alignment-policy";

interface UsePoseGuideAlignmentOptions {
  guideId: string | null;
  targetReady: boolean;
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
}: UsePoseGuideAlignmentOptions) {
  const identityRef = useRef({ guideId, targetReady });
  identityRef.current = { guideId, targetReady };
  const policyRef = useRef(
    createPoseGuideAlignmentPolicyState(guideId, targetReady),
  );
  const [snapshot, setSnapshot] = useState(() =>
    toPoseGuideAlignmentSnapshot(policyRef.current),
  );
  const publishedSnapshotRef = useRef(snapshot);

  useEffect(() => {
    policyRef.current = resetPoseGuideAlignmentPolicy(
      policyRef.current,
      guideId,
      targetReady,
    );
    const nextSnapshot = toPoseGuideAlignmentSnapshot(policyRef.current);
    if (!isSameSnapshot(publishedSnapshotRef.current, nextSnapshot)) {
      publishedSnapshotRef.current = nextSnapshot;
      setSnapshot(nextSnapshot);
    }
  }, [guideId, targetReady]);

  const observe = useCallback(
    ({
      result,
      targetPersonCount,
      livePersonCount,
    }: PoseGuideAlignmentObservation) => {
      const identity = identityRef.current;
      policyRef.current = resetPoseGuideAlignmentPolicy(
        policyRef.current,
        identity.guideId,
        identity.targetReady,
      );
      policyRef.current = advancePoseGuideAlignmentPolicy(policyRef.current, {
        result,
        targetPersonCount,
        livePersonCount,
        nowMs: Date.now(),
      });

      const nextSnapshot = toPoseGuideAlignmentSnapshot(policyRef.current);
      if (!isSameSnapshot(publishedSnapshotRef.current, nextSnapshot)) {
        publishedSnapshotRef.current = nextSnapshot;
        setSnapshot(nextSnapshot);
      }
    },
    [],
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
  };
}
