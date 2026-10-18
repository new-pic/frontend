import { en } from "./locales/en";
import { ko } from "./locales/ko";

type TranslationKeyOf<T> = {
  [Key in keyof T & string]: T[Key] extends string
    ? Key
    : T[Key] extends Record<string, unknown>
      ? `${Key}.${TranslationKeyOf<T[Key]>}`
      : never;
}[keyof T & string];

export type AppTranslationKey = TranslationKeyOf<typeof ko>;
export type AppTranslationOptions = Record<string, unknown> & {
  lng?: string;
};
export type AppTranslator = (
  key: AppTranslationKey,
  options?: AppTranslationOptions,
) => string;

function getFallbackResource(language: unknown) {
  return typeof language === "string" && language.toLowerCase().startsWith("en")
    ? en
    : ko;
}

function getFallbackTranslation(
  key: AppTranslationKey,
  options: AppTranslationOptions,
) {
  let value: unknown = getFallbackResource(options.lng);

  for (const segment of key.split(".")) {
    if (typeof value !== "object" || value === null || !(segment in value)) {
      return key;
    }
    value = (value as Record<string, unknown>)[segment];
  }

  return typeof value === "string" ? value : key;
}

const fallbackTranslator: AppTranslator = (key, options = {}) =>
  getFallbackTranslation(key, options).replace(
    /\{\{(\w+)\}\}/g,
    (match, name: string) => {
      const replacement = options[name];
      return replacement === undefined ? match : String(replacement);
    },
  );

let runtimeTranslator: AppTranslator = fallbackTranslator;

export function registerRuntimeTranslator(translator: AppTranslator) {
  runtimeTranslator = translator;
}

export const translate: AppTranslator = (key, options) =>
  runtimeTranslator(key, options);
