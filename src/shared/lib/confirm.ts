import { useCallback } from "react";
import { Alert } from "react-native";
import { useAppTranslation } from "./i18n";
import type { ConfirmOptions } from "./confirm-types";

export function useConfirm() {
  const { t } = useAppTranslation();
  return useCallback(
    ({
      title,
      message,
      confirmText = t("common.actions.yes"),
      cancelText = t("common.actions.no"),
      destructive = false,
    }: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        let isResolved = false;

        const resolveOnce = (result: boolean) => {
          if (isResolved) return;
          isResolved = true;
          resolve(result);
        };

        Alert.alert(
          title,
          message,
          [
            {
              text: cancelText,
              style: "cancel",
              onPress: () => resolveOnce(false),
            },
            {
              text: confirmText,
              style: destructive ? "destructive" : "default",
              isPreferred: true,
              onPress: () => resolveOnce(true),
            },
          ],
          {
            cancelable: true,
            onDismiss: () => resolveOnce(false),
          },
        );
      }),
    [t],
  );
}
