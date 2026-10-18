import type { Locale } from "expo-localization";

export const SUPPORTED_APP_LANGUAGES = ["ko", "en"] as const;

export type AppLanguage = (typeof SUPPORTED_APP_LANGUAGES)[number];

export const DEFAULT_APP_LANGUAGE: AppLanguage = "ko";

export function resolveAppLanguage(
  locales: ReadonlyArray<Pick<Locale, "languageCode">>,
): AppLanguage {
  for (const locale of locales) {
    const languageCode = locale.languageCode?.toLowerCase();

    if (languageCode === "ko" || languageCode === "en") {
      return languageCode;
    }
  }

  return DEFAULT_APP_LANGUAGE;
}
