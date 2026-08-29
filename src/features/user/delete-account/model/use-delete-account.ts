import { usersQuery } from "@entities/user";
import { getApiErrorMessage } from "@shared/api";
import { useConfirm } from "@shared/lib";
import { useAuthStore } from "@shared/model";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useCallback } from "react";
import { Alert } from "react-native";

export function useDeleteAccount() {
  const openConfirm = useConfirm();
  const logout = useAuthStore((state) => state.logout);
  const queryClient = useQueryClient();
  const { isPending, mutateAsync } =
    usersQuery.useRequestAccountWithdrawal();

  const deleteAccount = useCallback(async () => {
    if (isPending) return;

    const shouldDelete = await openConfirm({
      title: "회원 탈퇴",
      message:
        "탈퇴를 요청하면 모든 기기에서 로그아웃되며 계정과 작성 데이터는 30일 후 삭제됩니다. 30일 이내에 같은 계정으로 다시 로그인하면 복구할 수 있습니다. 회원 탈퇴를 진행하시겠습니까?",
      confirmText: "탈퇴",
      cancelText: "취소",
      destructive: true,
    });

    if (!shouldDelete) return;

    try {
      await mutateAsync();
    } catch (error) {
      Alert.alert(
        "회원 탈퇴 실패",
        getApiErrorMessage(
          error,
          "회원 탈퇴를 요청하지 못했습니다. 다시 시도해주세요.",
        ),
      );
      return;
    }

    try {
      await logout();
    } finally {
      queryClient.clear();
      router.replace("/");
    }
  }, [isPending, logout, mutateAsync, openConfirm, queryClient]);

  return {
    deleteAccount,
    isDeleting: isPending,
  };
}
