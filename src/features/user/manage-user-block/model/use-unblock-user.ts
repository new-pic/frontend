import { userBlockQuery } from "@entities/user";
import { getApiErrorMessage } from "@shared/api";
import { useConfirm } from "@shared/lib";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import { Alert } from "react-native";
import {
  refreshUserContentQueries,
  removeUnblockedUserFromListCache,
} from "./blocked-user-cache";

interface UnblockUserOptions {
  userId: string;
  nickname: string;
}

export function useUnblockUser() {
  const openConfirm = useConfirm();
  const queryClient = useQueryClient();
  const unblockMutation = userBlockQuery.useUnblockUser();
  const isUnblockingRef = useRef(false);

  const unblockUser = useCallback(
    async ({ userId, nickname }: UnblockUserOptions) => {
      if (isUnblockingRef.current) return false;

      const shouldUnblock = await openConfirm({
        title: "차단 해제",
        message: `${nickname}님의 차단을 해제하시겠습니까?`,
        confirmText: "해제",
        cancelText: "취소",
      });
      if (!shouldUnblock) return false;

      isUnblockingRef.current = true;
      try {
        await unblockMutation.mutateAsync(userId);
        removeUnblockedUserFromListCache(queryClient, userId);
        await queryClient.invalidateQueries({
          queryKey: userBlockQuery.userBlockQueryKeys.all,
        });
        void refreshUserContentQueries(queryClient);
        return true;
      } catch (error) {
        Alert.alert(
          "차단 해제 실패",
          getApiErrorMessage(
            error,
            "사용자 차단을 해제하지 못했습니다. 다시 시도해주세요.",
          ),
        );
        return false;
      } finally {
        isUnblockingRef.current = false;
      }
    },
    [openConfirm, queryClient, unblockMutation],
  );

  return {
    unblockUser,
    isUnblocking: unblockMutation.isPending,
    unblockingUserId: unblockMutation.variables,
  };
}
