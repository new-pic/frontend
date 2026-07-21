import { useCallback } from "react";
import type { ConfirmOptions } from "./confirm-types";

export function useConfirm() {
  return useCallback(({ title, message }: ConfirmOptions) => {
    const result = window.confirm(
      [title, message].filter(Boolean).join("\n\n"),
    );
    return Promise.resolve(result);
  }, []);
}
