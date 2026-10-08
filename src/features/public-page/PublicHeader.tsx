import React, { useState, useEffect, useCallback } from "react";
import { PublicSpaSection } from "../../api/types";
import { PublicNavigation } from "./PublicNavigation";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useLocale } from "./useLocale";
import { t } from "../../lib/translations";
import styles from "./PublicHeader.module.css";

interface PublicHeaderProps {
  siteTitle: string;
  sections: PublicSpaSection[];
  activeSectionKey: string | null;
}

export const PublicHeader: React.FC<PublicHeaderProps> = ({
  siteTitle,
  sections,
  activeSectionKey,
}) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { locale } = useLocale();

  const closeMobileMenu = useCallback(() => {
    setIsMobileOpen(false);
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileOpen((prev) => !prev);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isMobileOpen) {
        closeMobileMenu();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileOpen, closeMobileMenu]);

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <a href="#top" className={styles.brandLink}>
          {siteTitle || t(locale, "header", "brandFallback")}
        </a>

        <div className={styles.headerActions}>
          <div className={styles.desktopNav}>
            <PublicNavigation
              sections={sections}
              activeSectionKey={activeSectionKey}
              navId="public-desktop-navigation"
            />
          </div>

          <LanguageSwitcher className={styles.desktopLangSwitcher} />

          <button
            type="button"
            className={styles.mobileMenuButton}
            aria-expanded={isMobileOpen}
            aria-controls="public-mobile-navigation"
            aria-label={t(locale, "header", "menuToggle")}
            onClick={toggleMobileMenu}
          >
            {isMobileOpen
              ? t(locale, "header", "menuClose")
              : t(locale, "header", "menuOpen")}
          </button>
        </div>
      </div>

      <div
        className={`${styles.mobileNavDrawer} ${isMobileOpen ? styles.mobileNavOpen : ""}`}
      >
        <PublicNavigation
          sections={sections}
          activeSectionKey={activeSectionKey}
          onLinkClick={closeMobileMenu}
          navId="public-mobile-navigation"
        />
        <div className={styles.mobileDrawerFooter}>
          <LanguageSwitcher onSelect={closeMobileMenu} />
        </div>
      </div>
    </header>
  );
};
