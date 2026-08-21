import React from "react";
import { PublicSpaSection } from "../../api/types";
import styles from "./PublicNavigation.module.css";

interface PublicNavigationProps {
  sections: PublicSpaSection[];
  activeSectionKey: string | null;
  onLinkClick?: () => void;
  navId?: string;
}

export const PublicNavigation: React.FC<PublicNavigationProps> = ({
  sections,
  activeSectionKey,
  onLinkClick,
  navId = "public-navigation",
}) => {
  return (
    <nav id={navId} aria-label="Main navigation">
      <ul className={styles.navList}>
        {sections.map((section) => {
          const isActive = activeSectionKey === section.key;
          return (
            <li key={section.id} className={styles.navItem}>
              <a
                href={`#${section.key}`}
                className={`${styles.navLink} ${isActive ? styles.activeNavLink : ""}`}
                aria-current={isActive ? "location" : undefined}
                onClick={onLinkClick}
              >
                {section.navigation_label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
