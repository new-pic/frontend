import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { refreshPublishedFeedLists } from "../../lib/refresh-published-feed-lists";
import { monitorFeedAiJob } from "./feed-ai-job-monitor";
import { useFeedProcessingStore } from "./feed-processing-store";

export function FeedProcessingCoordinator() {
  const queryClient = useQueryClient();
  const jobId = useFeedProcessingStore(
    (state) => state.processingLifecycle?.jobId,
  );
  const processingPhase = useFeedProcessingStore(
    (state) => state.processingLifecycle?.processingPhase,
  );
  const [appState, setAppState] = useState<AppStateStatus>(
    AppState.currentState,
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", setAppState);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const current = useFeedProcessingStore.getState().processingLifecycle;
    if (
      !jobId ||
      processingPhase !== "completed" ||
      current?.jobId !== jobId ||
      current.feedListSyncState !== "idle"
    ) {
      return;
    }

    useFeedProcessingStore.getState().setFeedListSyncState(jobId, "pending");
    void refreshPublishedFeedLists(queryClient)
      .then(() => {
        useFeedProcessingStore
          .getState()
          .setFeedListSyncState(jobId, "succeeded");
      })
      .catch(() => {
        useFeedProcessingStore.getState().setFeedListSyncState(jobId, "failed");
      });
  }, [jobId, processingPhase, queryClient]);

  useEffect(() => {
    if (!jobId || processingPhase !== "processing" || appState !== "active") {
      return;
    }

    const controller = new AbortController();

    void monitorFeedAiJob({
      jobId,
      signal: controller.signal,
      onStatusSnapshot: (status) =>
        useFeedProcessingStore.getState().applyStatusSnapshot(jobId, status),
      onProgressEvent: (event) =>
        useFeedProcessingStore.getState().applyProgressEvent(jobId, event),
      onMonitoringStateChange: (state) =>
        useFeedProcessingStore.getState().setMonitoringState(jobId, state),
    }).then((result) => {
      if (result === "completed") {
        useFeedProcessingStore.getState().markProcessingCompleted(jobId);
      } else if (result === "failed") {
        useFeedProcessingStore.getState().markProcessingFailed(jobId);
      }
    });

    return () => {
      controller.abort();
      const current = useFeedProcessingStore.getState().processingLifecycle;
      if (
        current?.jobId === jobId &&
        current.processingPhase === "processing"
      ) {
        useFeedProcessingStore
          .getState()
          .setMonitoringState(jobId, "disconnected");
      }
    };
  }, [appState, jobId, processingPhase]);

  return null;
}
