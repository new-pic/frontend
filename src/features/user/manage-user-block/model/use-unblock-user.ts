import { userQueryKeys } from "@entities/user";
import { getApiErrorMessage } from "@shared/api";
import { useAppTranslation, useConfirm } from "@shared/lib";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import { Alert } from "react-native";
import {
  refreshUserContentQueries,
  removeUnblockedUserFromListCache,
} from "./blocked-user-cache";
import { userBlockQuery } from "../api";

interface UnblockUserOptions {
  userId: string;
  nickname: string;
}

export function useUnblockUser() {
  const { t } = useAppTranslation();
  const openConfirm = useConfirm();
  const queryClient = useQueryClient();
  const unblockMutation = userBlockQuery.useUnblockUserMutation();
  const isUnblockingRef = useRef(false);

  const unblockUser = useCallback(
    async ({ userId, nickname }: UnblockUserOptions) => {
      if (isUnblockingRef.current) return false;

      isUnblockingRef.current = true;

      try {
        const shouldUnblock = await openConfirm({
          title: t("user.unblockTitle"),
          message: t("user.unblockDescription", { nickname }),
          confirmText: t("user.unblockConfirm"),
          cancelText: t("common.actions.cancel"),
        });

        if (!shouldUnblock) return false;

        await unblockMutation.mutateAsync(userId);

        removeUnblockedUserFromListCache(queryClient, userId);

        await queryClient.invalidateQueries({
          queryKey: userQueryKeys.blockLists(),
        });

        void refreshUserContentQueries(queryClient);

        return true;
      } catch (error) {
        Alert.alert(
          t("user.unblockFailedTitle"),
          getApiErrorMessage(error, t("user.unblockFailed")),
        );

        return false;
      } finally {
        isUnblockingRef.current = false;
      }
    },
    [openConfirm, queryClient, t, unblockMutation],
  );

  return {
    unblockUser,
    isUnblocking: unblockMutation.isPending,
    unblockingUserId: unblockMutation.variables,
  };
}
