export type RtcStoredPhotoExpiryState =
  | "ACTIVE"
  | "EXPIRING_SOON"
  | "EXPIRED"
  | "INVALID";

export function getRtcStoredPhotoExpiryState(
  expiresAt: string,
  nowMs: number,
  expiringSoonThresholdMs: number,
): RtcStoredPhotoExpiryState {
  const expiryMs = Date.parse(expiresAt);
  if (!Number.isFinite(expiryMs)) return "INVALID";

  const remainingMs = expiryMs - nowMs;
  if (remainingMs <= 0) return "EXPIRED";
  if (remainingMs <= expiringSoonThresholdMs) {
    return "EXPIRING_SOON";
  }
  return "ACTIVE";
}

export function getRtcStoredPhotoExpiryTransitionDelay(
  expiresAt: string,
  nowMs: number,
  expiringSoonThresholdMs: number,
): number | null {
  const expiryMs = Date.parse(expiresAt);
  if (!Number.isFinite(expiryMs) || expiryMs <= nowMs) return null;

  const remainingMs = expiryMs - nowMs;
  return remainingMs > expiringSoonThresholdMs
    ? remainingMs - expiringSoonThresholdMs
    : remainingMs;
}

export function formatRtcStoredPhotoCreatedAt(
  createdAt: string,
): string | null {
  const timestamp = Date.parse(createdAt);
  if (!Number.isFinite(timestamp)) return null;

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
}
