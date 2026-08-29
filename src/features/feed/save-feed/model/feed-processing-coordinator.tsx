import {
  getFeedAiJobStatus,
  subscribeFeedAiJobEvents,
  type FeedAiJobEvent,
} from "@entities/feed";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { FEED_PROCESSING_CONFIG } from "../config/feed-processing-config";
import { refreshPublishedFeedLists } from "../lib/refresh-published-feed-lists";
import { useFeedProcessingStore } from "./feed-processing-store";

function abortableDelay(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }

    const handleAbort = () => {
      clearTimeout(timeout);
      reject(signal.reason);
    };
    const timeout = setTimeout(() => {
      signal.removeEventListener("abort", handleAbort);
      resolve();
    }, ms);
    signal.addEventListener("abort", handleAbort, { once: true });
  });
}

function isAbortError(error: unknown, signal: AbortSignal) {
  return (
    signal.aborted || (error instanceof Error && error.name === "AbortError")
  );
}

export function FeedProcessingCoordinator() {
  const queryClient = useQueryClient();
  const jobId = useFeedProcessingStore((state) => state.job?.jobId);
  const phase = useFeedProcessingStore((state) => state.job?.phase);
  const [appState, setAppState] = useState<AppStateStatus>(
    AppState.currentState,
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", setAppState);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const current = useFeedProcessingStore.getState().job;
    if (
      !jobId ||
      phase !== "completed" ||
      current?.jobId !== jobId ||
      current.listRefreshState !== "idle"
    ) {
      return;
    }

    useFeedProcessingStore.getState().setListRefreshState(jobId, "pending");
    void refreshPublishedFeedLists(queryClient)
      .then(() => {
        useFeedProcessingStore
          .getState()
          .setListRefreshState(jobId, "succeeded");
      })
      .catch(() => {
        useFeedProcessingStore.getState().setListRefreshState(jobId, "failed");
      });
  }, [jobId, phase, queryClient]);

  useEffect(() => {
    if (!jobId || phase !== "processing" || appState !== "active") {
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;
    let disposed = false;
    let terminalHandled = false;

    const store = useFeedProcessingStore.getState();

    const complete = () => {
      if (terminalHandled || disposed) return;
      terminalHandled = true;
      store.complete(jobId);
      store.setListRefreshState(jobId, "pending");
      controller.abort();

      void refreshPublishedFeedLists(queryClient)
        .then(() => {
          useFeedProcessingStore
            .getState()
            .setListRefreshState(jobId, "succeeded");
        })
        .catch(() => {
          useFeedProcessingStore
            .getState()
            .setListRefreshState(jobId, "failed");
        });
    };

    const fail = () => {
      if (terminalHandled || disposed) return;
      terminalHandled = true;
      store.fail(jobId);
      controller.abort();
    };

    const handleEvent = (event: FeedAiJobEvent) => {
      if (event.type === "completed") {
        complete();
        return;
      }
      if (event.type === "failed") {
        fail();
        return;
      }

      if (event.data.status === "FAILED") {
        fail();
      } else if (event.data.status === "COMPLETED" || event.data.isCompleted) {
        complete();
      } else {
        store.applyProgress(jobId, event.data);
      }
    };

    const synchronizeStatus = async () => {
      const status = await getFeedAiJobStatus(jobId, signal);
      if (disposed || terminalHandled) return true;

      store.applyStatus(jobId, status);
      if (status.status === "FAILED") {
        fail();
        return true;
      }
      if (status.status === "COMPLETED" || status.isCompleted) {
        complete();
        return true;
      }
      return false;
    };

    const pollUntilTerminal = async () => {
      store.setTransportState(jobId, "polling");

      while (!disposed && !terminalHandled && !signal.aborted) {
        try {
          if (await synchronizeStatus()) return;
          store.setTransportState(jobId, "polling");
        } catch (error) {
          if (isAbortError(error, signal)) return;
          store.setTransportState(jobId, "disconnected");
        }

        try {
          await abortableDelay(
            FEED_PROCESSING_CONFIG.pollingIntervalMs,
            signal,
          );
        } catch {
          return;
        }
      }
    };

    const run = async () => {
      try {
        if (await synchronizeStatus()) return;
      } catch (error) {
        if (isAbortError(error, signal)) return;
        store.setTransportState(jobId, "disconnected");
      }

      if (disposed || terminalHandled || signal.aborted) return;

      try {
        store.setTransportState(jobId, "connecting");
        await subscribeFeedAiJobEvents({
          jobId,
          signal,
          onOpen: () => store.setTransportState(jobId, "streaming"),
          onEvent: handleEvent,
        });

        if (!terminalHandled && !disposed) {
          throw new Error("Feed AI job stream ended before a terminal event");
        }
      } catch (error) {
        if (isAbortError(error, signal) || terminalHandled || disposed) {
          return;
        }
        store.setTransportState(jobId, "disconnected");
        await pollUntilTerminal();
      }
    };

    void run();

    return () => {
      disposed = true;
      controller.abort();
      const current = useFeedProcessingStore.getState().job;
      if (current?.jobId === jobId && current.phase === "processing") {
        useFeedProcessingStore
          .getState()
          .setTransportState(jobId, "disconnected");
      }
    };
  }, [appState, jobId, phase, queryClient]);

  return null;
}
