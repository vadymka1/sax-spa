export type Locale = "en" | "de";

export const SUPPORTED_LOCALES: readonly Locale[] = ["en", "de"] as const;
export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_STORAGE_KEY = "spa.locale";

export interface LocaleConfig {
  code: Locale;
  label: string;
  flag: string;
  buttonLabel: string;
}

export const LOCALES: Record<Locale, LocaleConfig> = {
  en: {
    code: "en",
    label: "EN",
    flag: "🇬🇧",
    buttonLabel: "Switch language to English",
  },
  de: {
    code: "de",
    label: "DE",
    flag: "🇩🇪",
    buttonLabel: "Switch language to German",
  },
};

export function isValidLocale(value: unknown): value is Locale {
  return value === "en" || value === "de";
}

export function getStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isValidLocale(stored)) {
      return stored;
    }
    if (stored !== null) {
      // Clean up invalid stored value
      localStorage.removeItem(LOCALE_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors (private browsing, security restrictions)
  }
  return DEFAULT_LOCALE;
}

export function setStoredLocale(locale: Locale): void {
  try {
    if (isValidLocale(locale)) {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    }
  } catch {
    // Ignore storage errors
  }
}
