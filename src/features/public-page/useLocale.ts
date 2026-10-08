import { useContext } from "react";
import { LocaleContext, LocaleContextValue } from "./localeContext";

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) {
    return {
      locale: "en",
      setLocale: () => {},
    };
  }
  return context;
}
