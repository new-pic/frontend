import { userBlockQuery } from "@entities/user";
import { getApiErrorMessage } from "@shared/api";
import { useMemberAccess } from "@shared/hooks";
import { useConfirm } from "@shared/lib";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import { Alert } from "react-native";
import {
  hideBlockedUserContent,
  refreshUserContentQueries,
} from "./blocked-user-cache";

interface BlockUserOptions {
  userId: string;
  nickname: string;
  onBlocked?: () => void;
}

export function useBlockUser() {
  const openConfirm = useConfirm();
  const requireMember = useMemberAccess();
  const queryClient = useQueryClient();
  const blockMutation = userBlockQuery.useBlockUser();
  const isBlockingRef = useRef(false);

  const blockUser = useCallback(
    async ({ userId, nickname, onBlocked }: BlockUserOptions) => {
      if (isBlockingRef.current) return false;

      isBlockingRef.current = true;

      try {
        if (!(await requireMember())) return false;

        const shouldBlock = await openConfirm({
          title: "사용자 차단",
          message: `${nickname}님의 게시글과 댓글이 더 이상 표시되지 않습니다. 차단한 사용자는 프로필에서 해제할 수 있습니다.`,
          confirmText: "차단",
          cancelText: "취소",
          destructive: true,
        });

        if (!shouldBlock) return false;

        await blockMutation.mutateAsync(userId);
        await hideBlockedUserContent(queryClient, userId);

        await queryClient.invalidateQueries({
          queryKey: userBlockQuery.userBlockQueryKeys.all,
        });

        onBlocked?.();
        void refreshUserContentQueries(queryClient);

        Alert.alert("차단 완료", `${nickname}님을 차단했습니다.`);
        return true;
      } catch (error) {
        Alert.alert(
          "사용자 차단 실패",
          getApiErrorMessage(
            error,
            "사용자를 차단하지 못했습니다. 다시 시도해주세요.",
          ),
        );

        return false;
      } finally {
        isBlockingRef.current = false;
      }
    },
    [blockMutation, openConfirm, queryClient, requireMember],
  );

  return {
    blockUser,
    isBlocking: blockMutation.isPending,
  };
}
