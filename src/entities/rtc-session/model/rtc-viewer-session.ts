import type { RtcViewerLiveKitTokenRequest, RtcViewerSession } from "./models";

export function isCurrentRtcViewerSession(
  session: RtcViewerSession | null,
  request: RtcViewerLiveKitTokenRequest,
): boolean {
  return (
    session?.roomId === request.roomId.trim() &&
    session.participantId === request.participantId.trim()
  );
}
