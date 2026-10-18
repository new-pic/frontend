import { useAppTranslation, useConfirm } from "@shared/lib";
import { router } from "expo-router";
import { useCallback } from "react";
import { deleteFeedQuery } from "../api";

export function useDeleteFeed(feedId: string) {
  const { t } = useAppTranslation();
  const openConfirm = useConfirm();
  const { isPending, mutate } = deleteFeedQuery.useDeleteFeedMutation();

  const deleteFeed = useCallback(async () => {
    if (isPending) return;

    const shouldDelete = await openConfirm({
      title: t("feed.deleteDialog.title"),
      message: t("feed.deleteDialog.message"),
      confirmText: t("feed.deleteDialog.confirm"),
      cancelText: t("common.actions.cancel"),
      destructive: true,
    });

    if (!shouldDelete) return;

    mutate(feedId);
    router.replace("/feed");
  }, [feedId, isPending, mutate, openConfirm, t]);

  return {
    deleteFeed,
    isDeleting: isPending,
  };
}
