import { create } from "zustand";
import { RtcHostSession, RtcViewerSession } from "./models";

export interface RtcStore {
  hostSession: RtcHostSession | null;
  viewerSession: RtcViewerSession | null;

  setHostSession: (session: RtcHostSession) => void;
  updateHostSessionExpiresAt: (roomId: string, expiresAt: string) => void;
  clearHostSession: () => void;

  setViewerSession: (session: RtcViewerSession) => void;
  clearViewerSession: () => void;

  clearRtcSession: () => void;
}

/**
 * RTC Host/Viewer session identity는 SecureStore 등에 영속화하지 않고
 * 현재 앱 프로세스의 메모리에만 보관합니다.
 */
export const useRtcStore = create<RtcStore>()((set) => ({
  hostSession: null,
  viewerSession: null,

  setHostSession: (hostSession) => {
    set({
      hostSession,
      viewerSession: null,
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
    set({
      hostSession: null,
    });
  },

  setViewerSession: (viewerSession) => {
    set({
      hostSession: null,
      viewerSession,
    });
  },
  clearViewerSession: () => {
    set({
      viewerSession: null,
    });
  },
  clearRtcSession: () => {
    set({
      hostSession: null,
      viewerSession: null,
    });
  },
}));
