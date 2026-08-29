import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { resetMyRtcStoredPhotos } from "../lib/reset-my-rtc-stored-photos";

export function useResetMyRtcStoredPhotos() {
  const queryClient = useQueryClient();

  return useCallback(() => resetMyRtcStoredPhotos(queryClient), [queryClient]);
}
