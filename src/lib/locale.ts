export type AppLocale = "ja" | "en";

const LOCALE_STORAGE_KEY = "launch-check-locale";

export function getStoredLocale(): AppLocale {
  if (typeof window === "undefined") {
    return "en";
  }

  return window.localStorage.getItem(LOCALE_STORAGE_KEY) === "ja" ? "ja" : "en";
}

export function setStoredLocale(locale: AppLocale): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }
}
