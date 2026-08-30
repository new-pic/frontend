import { create } from "zustand";
import {
  RtcHostSession,
  RtcLiveKitConnection,
  RtcViewerSession,
} from "./models";

export interface RtcStore {
  hostSession: RtcHostSession | null;
  viewerSession: RtcViewerSession | null;
  liveKitConnection: RtcLiveKitConnection | null;

  setHostSession: (session: RtcHostSession) => void;
  updateHostSessionExpiresAt: (roomId: string, expiresAt: string) => void;
  clearHostSession: () => void;

  setViewerSession: (session: RtcViewerSession) => void;
  clearViewerSession: () => void;

  setLiveKitConnection: (connection: RtcLiveKitConnection) => void;
  clearLiveKitConnection: () => void;
  clearRtcSession: () => void;
}

/**
 * RTC 토큰은 SecureStore 등에 영속화하지 않고 현재 앱 프로세스의
 * 메모리에만 보관합니다.
 */
export const useRtcStore = create<RtcStore>()((set) => ({
  hostSession: null,
  viewerSession: null,
  liveKitConnection: null,

  setHostSession: (hostSession) => {
    set({
      hostSession,
      viewerSession: null,
      liveKitConnection: null,
    });
  },
  updateHostSessionExpiresAt: (roomId, expiresAt) => {
    set((state) => {
      if (state.hostSession?.roomId !== roomId) return state;

      return {
        hostSession: {
          ...state.hostSession,
          expiresAt,
        },
      };
    });
  },
  clearHostSession: () => {
    set((state) => ({
      hostSession: null,
      liveKitConnection:
        state.liveKitConnection?.role === "HOST"
          ? null
          : state.liveKitConnection,
    }));
  },

  setViewerSession: (viewerSession) => {
    set({
      hostSession: null,
      viewerSession,
      liveKitConnection: null,
    });
  },
  clearViewerSession: () => {
    set((state) => ({
      viewerSession: null,
      liveKitConnection:
        state.liveKitConnection?.role === "VIEWER"
          ? null
          : state.liveKitConnection,
    }));
  },

  setLiveKitConnection: (liveKitConnection) => {
    set({ liveKitConnection });
  },
  clearLiveKitConnection: () => {
    set({ liveKitConnection: null });
  },
  clearRtcSession: () => {
    set({
      hostSession: null,
      viewerSession: null,
      liveKitConnection: null,
    });
  },
}));
