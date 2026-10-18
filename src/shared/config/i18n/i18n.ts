import { getLocales } from "expo-localization";
import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import {
  DEFAULT_APP_LANGUAGE,
  resolveAppLanguage,
  SUPPORTED_APP_LANGUAGES,
} from "./app-language";
import { en } from "./locales/en";
import { ko } from "./locales/ko";
import {
  registerRuntimeTranslator,
  type AppTranslator,
} from "./translation-runtime";

export const i18n = i18next.createInstance();

void i18n.use(initReactI18next).init({
  resources: {
    ko: { translation: ko },
    en: { translation: en },
  },
  lng: resolveAppLanguage(getLocales()),
  fallbackLng: DEFAULT_APP_LANGUAGE,
  supportedLngs: [...SUPPORTED_APP_LANGUAGES],
  interpolation: {
    escapeValue: false,
  },
  initAsync: false,
  react: {
    useSuspense: false,
  },
});

registerRuntimeTranslator(i18n.t.bind(i18n) as unknown as AppTranslator);
