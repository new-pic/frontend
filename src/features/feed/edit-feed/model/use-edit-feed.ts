import { router } from "expo-router";
import { useCallback } from "react";

export function useEditFeed(feedId: string) {
  return useCallback(() => {
    router.push({
      pathname: "/feed/edit/[id]",
      params: { id: feedId },
    });
  }, [feedId]);
}
