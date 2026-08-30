import { useConfirm } from "@shared/lib";
import { router } from "expo-router";
import { useCallback } from "react";
import { deleteFeedQuery } from "../api";

export function useDeleteFeed(feedId: string) {
  const openConfirm = useConfirm();
  const { isPending, mutate } = deleteFeedQuery.useDeleteFeedMutation();

  const deleteFeed = useCallback(async () => {
    if (isPending) return;

    const shouldDelete = await openConfirm({
      title: "피드 삭제",
      message: "삭제한 피드는 복구할 수 없습니다. 정말 삭제하시겠습니까?",
      confirmText: "삭제",
      cancelText: "취소",
      destructive: true,
    });

    if (!shouldDelete) return;

    mutate(feedId);
    router.replace("/feed");
  }, [feedId, isPending, mutate, openConfirm]);

  return {
    deleteFeed,
    isDeleting: isPending,
  };
}
