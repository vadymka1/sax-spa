import React from "react";
import { useLocale } from "./useLocale";
import { LOCALES, SUPPORTED_LOCALES } from "../../lib/locale";
import styles from "./LanguageSwitcher.module.css";

interface LanguageSwitcherProps {
  className?: string;
  onSelect?: () => void;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  className,
  onSelect,
}) => {
  const { locale, setLocale } = useLocale();

  return (
    <div
      className={`${styles.switcherContainer} ${className || ""}`}
      role="group"
      aria-label="Language selection"
    >
      {SUPPORTED_LOCALES.map((code) => {
        const item = LOCALES[code];
        const isActive = locale === code;
        return (
          <button
            key={code}
            type="button"
            className={`${styles.langButton} ${isActive ? styles.activeLang : ""}`}
            onClick={() => {
              setLocale(code);
              onSelect?.();
            }}
            aria-pressed={isActive}
            aria-label={item.buttonLabel}
            data-testid={`lang-switch-${code}`}
          >
            <span className={styles.flag} aria-hidden="true">
              {item.flag}
            </span>
            <span className={styles.label}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};
