import axios from "axios";

export class ApiRequestError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.payload = payload;
  }
}

function readPayloadMessage(payload: unknown): string | undefined {
  if (typeof payload === "string") return payload.trim() || undefined;
  if (!payload || typeof payload !== "object") return undefined;

  const record = payload as Record<string, unknown>;
  const message = record.message;
  if (typeof message === "string") return message.trim() || undefined;
  if (Array.isArray(message)) {
    const joined = message
      .filter((item) => typeof item === "string")
      .join("\n");
    return joined || undefined;
  }

  const error = record.error;
  if (typeof error === "string") return error.trim() || undefined;

  const nestedOutput = record.output;
  if (nestedOutput && typeof nestedOutput === "object") {
    return readPayloadMessage(nestedOutput);
  }

  return undefined;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiRequestError) return error.message;

  if (axios.isAxiosError(error)) {
    return readPayloadMessage(error.response?.data) ?? fallback;
  }

  if (error instanceof Error && error.message) return error.message;
  return readPayloadMessage(error) ?? fallback;
}

export function createApiRequestError({
  payload,
  status,
  fallback,
}: {
  payload: unknown;
  status: number;
  fallback: string;
}) {
  return new ApiRequestError(
    readPayloadMessage(payload) ?? fallback,
    status,
    payload,
  );
}
