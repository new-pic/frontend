import type { Locale } from "expo-localization";

export const SUPPORTED_APP_LANGUAGES = ["ko", "en"] as const;

export type AppLanguage = (typeof SUPPORTED_APP_LANGUAGES)[number];

export const DEFAULT_APP_LANGUAGE: AppLanguage = "en";

export function resolveAppLanguage(
  locales: ReadonlyArray<Pick<Locale, "languageCode">>,
): AppLanguage {
  const languageCode = locales[0]?.languageCode?.toLowerCase();

  return languageCode === "ko" ? "ko" : DEFAULT_APP_LANGUAGE;
}
