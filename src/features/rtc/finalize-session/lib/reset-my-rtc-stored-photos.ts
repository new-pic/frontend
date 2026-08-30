import { rtcStoredPhotoQueryKeys } from "@entities/rtc-stored-photo";
import type { QueryClient } from "@tanstack/react-query";

export function resetMyRtcStoredPhotos(queryClient: QueryClient) {
  return queryClient.resetQueries(
    { queryKey: rtcStoredPhotoQueryKeys.myLists() },
    { cancelRefetch: false, throwOnError: true },
  );
}
