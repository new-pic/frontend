import type {
  FeedAiJobProgressEventDto,
  FeedAiJobStatusResponseDto,
} from "@entities/feed";
import {
  getFeedAiJobStatus,
  subscribeFeedAiJobEvents,
} from "../../api/feed-ai-job-client";
import type { FeedAiJobEvent } from "../../api/feed-ai-job-event";
import { FEED_PROCESSING_CONFIG } from "../../config/feed-processing-config";
import type { FeedProcessingMonitoringState } from "./feed-processing-types";

export type FeedAiJobMonitorResult = "completed" | "failed" | "aborted";

interface FeedAiJobMonitorCallbacks {
  onStatusSnapshot: (status: FeedAiJobStatusResponseDto) => void;
  onProgressEvent: (event: FeedAiJobProgressEventDto) => void;
  onMonitoringStateChange: (state: FeedProcessingMonitoringState) => void;
}

interface MonitorFeedAiJobOptions extends FeedAiJobMonitorCallbacks {
  jobId: string;
  signal: AbortSignal;
}

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

function getStatusResult(status: FeedAiJobStatusResponseDto) {
  if (status.status === "FAILED") return "failed" as const;
  if (status.status === "COMPLETED" || status.isCompleted) {
    return "completed" as const;
  }
  return null;
}

function getEventResult(event: FeedAiJobEvent) {
  if (event.type === "completed") return "completed" as const;
  if (event.type === "failed" || event.data.status === "FAILED") {
    return "failed" as const;
  }
  if (event.data.status === "COMPLETED" || event.data.isCompleted) {
    return "completed" as const;
  }
  return null;
}

/**
 * 서버 AI 작업을 최초 status 조회, SSE, polling fallback 순서로 관찰합니다.
 * React lifecycle과 상태 저장소는 알지 못하며 관찰 결과만 callback으로 전달합니다.
 */
export async function monitorFeedAiJob({
  jobId,
  signal: lifecycleSignal,
  onStatusSnapshot,
  onProgressEvent,
  onMonitoringStateChange,
}: MonitorFeedAiJobOptions): Promise<FeedAiJobMonitorResult> {
  const streamController = new AbortController();
  const { signal } = streamController;
  let terminalResult: Exclude<FeedAiJobMonitorResult, "aborted"> | null = null;

  const abortStream = () => streamController.abort(lifecycleSignal.reason);
  if (lifecycleSignal.aborted) abortStream();
  else lifecycleSignal.addEventListener("abort", abortStream, { once: true });

  const synchronizeStatus = async () => {
    const status = await getFeedAiJobStatus(jobId, signal);
    onStatusSnapshot(status);
    return getStatusResult(status);
  };

  const handleEvent = (event: FeedAiJobEvent) => {
    const result = getEventResult(event);
    if (result) {
      terminalResult = result;
      streamController.abort();
      return;
    }
    if (event.type === "progress") onProgressEvent(event.data);
  };

  const pollUntilTerminal = async (): Promise<FeedAiJobMonitorResult> => {
    onMonitoringStateChange("polling");

    while (!signal.aborted) {
      try {
        const result = await synchronizeStatus();
        if (result) return result;
        onMonitoringStateChange("polling");
      } catch (error) {
        if (isAbortError(error, signal)) return "aborted";
        onMonitoringStateChange("disconnected");
      }

      try {
        await abortableDelay(FEED_PROCESSING_CONFIG.pollingIntervalMs, signal);
      } catch {
        return "aborted";
      }
    }

    return "aborted";
  };

  try {
    try {
      const result = await synchronizeStatus();
      if (result) return result;
    } catch (error) {
      if (isAbortError(error, signal)) return "aborted";
      onMonitoringStateChange("disconnected");
    }

    if (signal.aborted) return "aborted";

    try {
      onMonitoringStateChange("connecting");
      await subscribeFeedAiJobEvents({
        jobId,
        signal,
        onOpen: () => onMonitoringStateChange("streaming"),
        onEvent: handleEvent,
      });

      if (terminalResult) return terminalResult;
      throw new Error("Feed AI job stream ended before a terminal event");
    } catch (error) {
      if (terminalResult) return terminalResult;
      if (isAbortError(error, signal)) return "aborted";
      onMonitoringStateChange("disconnected");
      return pollUntilTerminal();
    }
  } finally {
    lifecycleSignal.removeEventListener("abort", abortStream);
  }
}
