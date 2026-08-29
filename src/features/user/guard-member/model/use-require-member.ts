import { useConfirm } from "@shared/lib";
import { useAuthStore } from "@shared/model";
import { router } from "expo-router";
import { useCallback } from "react";

export function useRequireMember() {
  const isGuest = useAuthStore((state) => state.isGuest);
  const prepareAccountLink = useAuthStore((state) => state.prepareAccountLink);
  const openConfirm = useConfirm();

  return useCallback(async () => {
    if (!isGuest) return true;

    const shouldLogin = await openConfirm({
      title: "로그인이 필요한 기능이에요",
      message: "계정으로 로그인한 뒤 이용할 수 있어요. 로그인하시겠어요?",
      confirmText: "로그인하기",
      cancelText: "취소",
    });

    if (shouldLogin) {
      prepareAccountLink();
      router.replace("/");
    }

    return false;
  }, [isGuest, openConfirm, prepareAccountLink]);
}
