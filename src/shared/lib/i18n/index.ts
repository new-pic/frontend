export { translate } from "@shared/config/i18n";
import { useTranslation } from "react-i18next";

export function useAppTranslation() {
  return useTranslation();
}
