import type { FeedAiJobStatusResponseDto } from "@entities/feed";
import { createSseParser, privateApiClient } from "@shared/api";
import { env } from "@shared/config";
import { decodeAccessToken } from "@shared/lib/jwt";
import { useAuthStore } from "@shared/model";
import { fetch } from "expo/fetch";
import {
  createFeedProcessingDataPreview,
  logFeedProcessingDebug,
  summarizeFeedProcessingError,
  warnFeedProcessingDebug,
} from "../lib/feed-processing-debug";
import { parseFeedAiJobEvent, type FeedAiJobEvent } from "./feed-ai-job-event";

interface SubscribeFeedAiJobEventsOptions {
  jobId: string;
  signal: AbortSignal;
  onOpen?: () => void;
  onEvent: (event: FeedAiJobEvent) => void;
}

export async function getFeedAiJobStatus(
  jobId: string,
  signal?: AbortSignal,
): Promise<FeedAiJobStatusResponseDto> {
  const response = await privateApiClient.get<FeedAiJobStatusResponseDto>(
    `/feed/jobs/${jobId}`,
    { signal },
  );
  return response.data;
}

export async function subscribeFeedAiJobEvents({
  jobId,
  signal,
  onOpen,
  onEvent,
}: SubscribeFeedAiJobEventsOptions): Promise<void> {
  if (!env.API_URL) throw new Error("API_URL is not configured");

  const accessToken = useAuthStore.getState().accessToken?.trim() ?? "";
  const startedAtMs = Date.now();

  logFeedProcessingDebug("SSE", "request-started", {
    jobId,
    hasAccessToken: Boolean(accessToken),
    accessTokenExpired: accessToken
      ? decodeAccessToken.isExpired(accessToken)
      : null,
    abortedBeforeRequest: signal.aborted,
  });

  const response = await fetch(`${env.API_URL}/feed/jobs/${jobId}/events`, {
    method: "GET",
    headers: {
      Accept: "text/event-stream",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined),
    },
    signal,
  });

  const contentType = response.headers.get("content-type");
  logFeedProcessingDebug("SSE", "response-received", {
    jobId,
    status: response.status,
    ok: response.ok,
    contentType,
    elapsedMs: Date.now() - startedAtMs,
  });

  if (!response.ok) {
    const responsePreview = createFeedProcessingDataPreview(
      await response.text().catch(() => ""),
    );
    warnFeedProcessingDebug("SSE", "response-rejected", {
      jobId,
      status: response.status,
      contentType,
      responsePreview,
    });
    throw new Error(`Feed AI job stream failed (${response.status})`);
  }
  if (!response.body) {
    warnFeedProcessingDebug("SSE", "response-body-missing", {
      jobId,
      status: response.status,
      contentType,
    });
    throw new Error("Feed AI job stream body is unavailable");
  }

  logFeedProcessingDebug("SSE", "stream-opened", { jobId, contentType });
  onOpen?.();
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let chunkCount = 0;
  let receivedByteCount = 0;
  let messageCount = 0;
  const parser = createSseParser((message) => {
    const event = parseFeedAiJobEvent(message);
    messageCount += 1;
    logFeedProcessingDebug("SSE", "message-received", {
      jobId,
      rawEvent: message.event,
      parsedType: event?.type ?? null,
      dataPreview: createFeedProcessingDataPreview(message.data),
    });

    if (event) {
      onEvent(event);
    } else {
      warnFeedProcessingDebug("SSE", "message-ignored", {
        jobId,
        rawEvent: message.event,
      });
    }
  });

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunkCount += 1;
      receivedByteCount += value.byteLength;
      parser.push(decoder.decode(value, { stream: true }));
    }
    parser.push(decoder.decode());
    parser.finish();
    logFeedProcessingDebug("SSE", "stream-ended", {
      jobId,
      chunkCount,
      receivedByteCount,
      messageCount,
      elapsedMs: Date.now() - startedAtMs,
    });
  } catch (error) {
    warnFeedProcessingDebug("SSE", "stream-read-failed", {
      jobId,
      aborted: signal.aborted,
      chunkCount,
      receivedByteCount,
      messageCount,
      elapsedMs: Date.now() - startedAtMs,
      error: summarizeFeedProcessingError(error),
    });
    throw error;
  } finally {
    reader.releaseLock();
    logFeedProcessingDebug("SSE", "reader-released", {
      jobId,
      aborted: signal.aborted,
    });
  }
}
