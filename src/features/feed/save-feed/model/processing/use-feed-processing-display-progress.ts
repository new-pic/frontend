import { useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { FEED_PROCESSING_CONFIG } from "../../config/feed-processing-config";
import {
  createFeedProcessingProgressProjection,
  projectFeedProcessingProgress,
  rebaseFeedProcessingProgressProjection,
  type FeedProcessingProgressProjection,
} from "./feed-processing-progress";
import type { FeedAiProcessingLifecycle } from "./feed-processing-types";

interface ActiveProjection {
  jobId: string;
  projection: FeedProcessingProgressProjection;
}

function getProgressInput(processingLifecycle: FeedAiProcessingLifecycle) {
  return {
    serverProgressPercent: processingLifecycle.serverProgressPercent,
    estimatedRemainingSeconds: processingLifecycle.estimatedRemainingSeconds,
    progressSnapshotReceivedAtMs:
      processingLifecycle.progressSnapshotReceivedAtMs,
  };
}

export function useFeedProcessingDisplayProgress(
  processingLifecycle: FeedAiProcessingLifecycle | null,
) {
  const projectionRef = useRef<ActiveProjection | null>(null);
  const [displayProgressPercent, setDisplayProgressPercent] = useState(0);
  const [appState, setAppState] = useState<AppStateStatus>(
    AppState.currentState,
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", setAppState);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!processingLifecycle) {
      projectionRef.current = null;
      setDisplayProgressPercent(0);
      return;
    }

    if (processingLifecycle.processingPhase === "completed") {
      projectionRef.current = null;
      setDisplayProgressPercent(100);
      return;
    }

    const now = Date.now();
    const current = projectionRef.current;
    const isSameJob = current?.jobId === processingLifecycle.jobId;
    const projection = isSameJob
      ? rebaseFeedProcessingProgressProjection(
          current.projection,
          getProgressInput(processingLifecycle),
          now,
        )
      : createFeedProcessingProgressProjection(
          getProgressInput(processingLifecycle),
          now,
        );
    projectionRef.current = { jobId: processingLifecycle.jobId, projection };

    const projectedProgress = projectFeedProcessingProgress(projection, now);
    setDisplayProgressPercent((previousProgress) =>
      isSameJob
        ? Math.max(previousProgress, projectedProgress)
        : projectedProgress,
    );
  }, [
    processingLifecycle?.estimatedRemainingSeconds,
    processingLifecycle?.jobId,
    processingLifecycle?.processingPhase,
    processingLifecycle?.progressSnapshotReceivedAtMs,
    processingLifecycle?.serverProgressPercent,
  ]);

  useEffect(() => {
    if (
      !processingLifecycle ||
      processingLifecycle.processingPhase !== "processing" ||
      appState !== "active"
    ) {
      return;
    }

    const tick = () => {
      const current = projectionRef.current;
      if (!current || current.jobId !== processingLifecycle.jobId) return;

      const projectedProgress = projectFeedProcessingProgress(
        current.projection,
        Date.now(),
      );
      setDisplayProgressPercent((previousProgress) =>
        Math.max(previousProgress, projectedProgress),
      );
    };

    tick();
    const interval = setInterval(
      tick,
      FEED_PROCESSING_CONFIG.progressDisplayTickMs,
    );
    return () => clearInterval(interval);
  }, [
    appState,
    processingLifecycle?.jobId,
    processingLifecycle?.processingPhase,
  ]);

  return displayProgressPercent;
}
