import { privateApiClient } from "@shared/api";
import { env } from "@shared/config";
import { useAuthStore } from "@shared/model";
import { fetch } from "expo/fetch";
import type { FeedAiJobStatusResponseDto } from "../model";
import {
  parseFeedAiJobEvent,
  type FeedAiJobEvent,
} from "./feed-ai-job-event";
import { createSseParser } from "./sse-parser";

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
  if (!env.API_URL) {
    throw new Error("API_URL is not configured");
  }

  const accessToken = useAuthStore.getState().accessToken;
  const response = await fetch(
    `${env.API_URL}/feed/jobs/${jobId}/events`,
    {
      method: "GET",
      headers: {
        Accept: "text/event-stream",
        ...(accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : undefined),
      },
      signal,
    },
  );

  if (!response.ok) {
    throw new Error(`Feed AI job stream failed (${response.status})`);
  }
  if (!response.body) {
    throw new Error("Feed AI job stream body is unavailable");
  }

  onOpen?.();

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const parser = createSseParser((message) => {
    const event = parseFeedAiJobEvent(message);
    if (event) onEvent(event);
  });

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      parser.push(decoder.decode(value, { stream: true }));
    }
    parser.push(decoder.decode());
    parser.finish();
  } finally {
    reader.releaseLock();
  }
}
