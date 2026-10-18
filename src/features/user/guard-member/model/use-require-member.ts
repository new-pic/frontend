import { useAppTranslation, useConfirm } from "@shared/lib";
import { useAuthStore } from "@shared/model";
import { router } from "expo-router";
import { useCallback } from "react";

export function useRequireMember() {
  const { t } = useAppTranslation();
  const isGuest = useAuthStore((state) => state.isGuest);
  const prepareAccountLink = useAuthStore((state) => state.prepareAccountLink);
  const openConfirm = useConfirm();

  return useCallback(async () => {
    if (!isGuest) return true;

    const shouldLogin = await openConfirm({
      title: t("user.memberRequiredTitle"),
      message: t("user.memberRequiredDescription"),
      confirmText: t("user.signIn"),
      cancelText: t("common.actions.cancel"),
    });

    if (shouldLogin) {
      prepareAccountLink();
      router.replace("/");
    }

    return false;
  }, [isGuest, openConfirm, prepareAccountLink, t]);
}
