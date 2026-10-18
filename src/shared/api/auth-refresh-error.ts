export class MissingRefreshTokenError extends Error {
  constructor() {
    super("No refresh token available");
    this.name = "MissingRefreshTokenError";
  }
}

function readHttpStatus(error: unknown) {
  if (!error || typeof error !== "object") return null;

  const record = error as Record<string, unknown>;
  if (typeof record.status === "number") return record.status;

  const response = record.response;
  if (!response || typeof response !== "object") return null;

  const status = (response as Record<string, unknown>).status;
  return typeof status === "number" ? status : null;
}

export function isTerminalAuthRefreshError(error: unknown) {
  if (error instanceof MissingRefreshTokenError) return true;

  const status = readHttpStatus(error);
  if (status === null) return false;
  if (status === 408 || status === 429) return false;

  return status >= 400 && status < 500;
}
