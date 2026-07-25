import { create } from "zustand";

interface RTCStore {
  hostAccessToken: string | null;

  setSession: ({
    hostAccessToken,
  }: {
    hostAccessToken: string;
  }) => Promise<void>;
}

export const useRtcStore = create<RTCStore>()((set) => ({
  hostAccessToken: null,
  setSession: async ({ hostAccessToken }) => {
    set(() => ({
      hostAccessToken,
    }));
  },
}));
