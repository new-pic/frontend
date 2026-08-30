export interface RtcHostLiveKitTokenResponse {
  url: string;
  token: string;
  expiresAt: string;
}

export interface RtcHostLiveKitTokenRequest {
  roomId: string;
}

export interface RtcViewerLiveKitTokenResponse {
  url: string;
  token: string;
}

export interface RtcViewerLiveKitTokenRequest {
  roomId: string;
  participantId: string;
}

export interface RtcHostSession {
  roomId: string;
  joinCode: string;
  hostAccessToken: string;
  expiresAt: string;
}

export interface RtcViewerSession {
  roomId: string;
  participantId: string;
}

export type RtcLiveKitRole = "HOST" | "VIEWER";

export interface RtcLiveKitConnection {
  role: RtcLiveKitRole;
  url: string;
  token: string;
  expiresAt?: string;
}
