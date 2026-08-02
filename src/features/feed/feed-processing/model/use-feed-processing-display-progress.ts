import { useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { FEED_PROCESSING_CONFIG } from "../config/feed-processing-config";
import {
  createFeedProcessingProgressProjection,
  projectFeedProcessingProgress,
  rebaseFeedProcessingProgressProjection,
  type FeedProcessingProgressProjection,
} from "./feed-processing-progress";
import type { FeedProcessingJob } from "./types";

interface ActiveProjection {
  jobId: string;
  projection: FeedProcessingProgressProjection;
}

function getProgressInput(job: FeedProcessingJob) {
  return {
    serverProgressPercent: job.serverProgressPercent,
    estimatedRemainingSeconds: job.estimatedRemainingSeconds,
    progressEstimateUpdatedAt: job.progressEstimateUpdatedAt,
  };
}

export function useFeedProcessingDisplayProgress(
  job: FeedProcessingJob | null,
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
    if (!job) {
      projectionRef.current = null;
      setDisplayProgressPercent(0);
      return;
    }

    if (job.phase === "completed") {
      projectionRef.current = null;
      setDisplayProgressPercent(100);
      return;
    }

    const now = Date.now();
    const current = projectionRef.current;
    const isSameJob = current?.jobId === job.jobId;
    const projection = isSameJob
      ? rebaseFeedProcessingProgressProjection(
          current.projection,
          getProgressInput(job),
          now,
        )
      : createFeedProcessingProgressProjection(
          getProgressInput(job),
          now,
        );
    projectionRef.current = { jobId: job.jobId, projection };

    const projectedProgress = projectFeedProcessingProgress(projection, now);
    setDisplayProgressPercent((previousProgress) =>
      isSameJob
        ? Math.max(previousProgress, projectedProgress)
        : projectedProgress,
    );
  }, [
    job?.estimatedRemainingSeconds,
    job?.jobId,
    job?.phase,
    job?.progressEstimateUpdatedAt,
    job?.serverProgressPercent,
  ]);

  useEffect(() => {
    if (!job || job.phase !== "processing" || appState !== "active") {
      return;
    }

    const tick = () => {
      const current = projectionRef.current;
      if (!current || current.jobId !== job.jobId) return;

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
  }, [appState, job?.jobId, job?.phase]);

  return displayProgressPercent;
}
