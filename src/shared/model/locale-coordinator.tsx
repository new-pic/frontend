import { i18n, resolveAppLanguage } from "@shared/config/i18n";
import { useLocales } from "expo-localization";
import { useEffect, useMemo } from "react";

export function LocaleCoordinator() {
  const locales = useLocales();
  const language = useMemo(() => resolveAppLanguage(locales), [locales]);

  useEffect(() => {
    if (i18n.resolvedLanguage !== language) {
      void i18n.changeLanguage(language);
    }
  }, [language]);

  return null;
}
