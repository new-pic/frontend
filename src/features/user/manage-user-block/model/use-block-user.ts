import { userQueryKeys } from "@entities/user";
import { getApiErrorMessage } from "@shared/api";
import { useAppTranslation, useConfirm } from "@shared/lib";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import { Alert } from "react-native";
import {
  hideBlockedUserContent,
  refreshUserContentQueries,
} from "./blocked-user-cache";
import { userBlockQuery } from "../api";

interface BlockUserOptions {
  userId: string;
  nickname: string;
  onBlocked?: () => void;
}

export function useBlockUser() {
  const { t } = useAppTranslation();
  const openConfirm = useConfirm();
  const queryClient = useQueryClient();
  const blockMutation = userBlockQuery.useBlockUserMutation();
  const isBlockingRef = useRef(false);

  const blockUser = useCallback(
    async ({ userId, nickname, onBlocked }: BlockUserOptions) => {
      if (isBlockingRef.current) return false;

      isBlockingRef.current = true;

      try {
        const shouldBlock = await openConfirm({
          title: t("user.blockTitle"),
          message: t("user.blockDescription", { nickname }),
          confirmText: t("user.blockConfirm"),
          cancelText: t("common.actions.cancel"),
          destructive: true,
        });

        if (!shouldBlock) return false;

        await blockMutation.mutateAsync(userId);
        await hideBlockedUserContent(queryClient, userId);

        await queryClient.invalidateQueries({
          queryKey: userQueryKeys.blockLists(),
        });

        onBlocked?.();
        void refreshUserContentQueries(queryClient);

        Alert.alert(
          t("user.blockCompletedTitle"),
          t("user.blockCompleted", { nickname }),
        );
        return true;
      } catch (error) {
        Alert.alert(
          t("user.blockFailedTitle"),
          getApiErrorMessage(error, t("user.blockFailed")),
        );

        return false;
      } finally {
        isBlockingRef.current = false;
      }
    },
    [blockMutation, openConfirm, queryClient, t],
  );

  return {
    blockUser,
    isBlocking: blockMutation.isPending,
  };
}
