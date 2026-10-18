import { getApiErrorMessage } from "@shared/api";
import { useAppTranslation, useConfirm } from "@shared/lib";
import { useAuthStore } from "@shared/model";
import { router } from "expo-router";
import { useCallback } from "react";
import { Alert } from "react-native";
import { accountQuery } from "../api";

export function useDeleteAccount() {
  const { t } = useAppTranslation();
  const openConfirm = useConfirm();
  const logout = useAuthStore((state) => state.logout);
  const { isPending, mutateAsync } = accountQuery.useRequestAccountWithdrawal();

  const deleteAccount = useCallback(async () => {
    if (isPending) return;

    const shouldDelete = await openConfirm({
      title: t("user.deleteAccountTitle"),
      message: t("user.deleteAccountDescription"),
      confirmText: t("user.deleteAccountConfirm"),
      cancelText: t("common.actions.cancel"),
      destructive: true,
    });

    if (!shouldDelete) return;

    try {
      await mutateAsync();
    } catch (error) {
      Alert.alert(
        t("user.deleteAccountFailedTitle"),
        getApiErrorMessage(error, t("user.deleteAccountFailed")),
      );
      return;
    }

    try {
      await logout();
    } finally {
      router.replace("/");
    }
  }, [isPending, logout, mutateAsync, openConfirm, t]);

  return {
    deleteAccount,
    isDeleting: isPending,
  };
}
