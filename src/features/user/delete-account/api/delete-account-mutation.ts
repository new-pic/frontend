import { getApiErrorMessage, privateApiClient } from "@shared/api";
import { useMutation } from "@tanstack/react-query";

const ACCOUNT_WITHDRAWAL_PENDING_MESSAGE = "탈퇴 유예 중";

function isAccountWithdrawalPendingError(error: unknown) {
  return getApiErrorMessage(error, "").includes(
    ACCOUNT_WITHDRAWAL_PENDING_MESSAGE,
  );
}

export function useRequestAccountWithdrawal() {
  return useMutation({
    mutationFn: async () => {
      try {
        await privateApiClient.delete("/users/me");
      } catch (error) {
        if (isAccountWithdrawalPendingError(error)) return;
        throw error;
      }
    },
  });
}
