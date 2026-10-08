import { createContext } from "react";
import { Locale } from "../../lib/locale";

export interface LocaleContextValue {
  locale: Locale;
  setLocale: (nextLocale: Locale) => void;
}

export const LocaleContext = createContext<LocaleContextValue | null>(null);
