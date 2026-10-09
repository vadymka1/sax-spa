import React, { useEffect, useMemo } from "react";
import { usePublicPage } from "../../hooks/usePublicPage";
import { useActiveSection } from "../../hooks/useActiveSection";
import { PublicHeader } from "./PublicHeader";
import { PublicSection } from "./PublicSection";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { LocaleProvider } from "./LocaleProvider";
import { useLocale } from "./useLocale";
import { t } from "../../lib/translations";
import styles from "./PublicPage.module.css";

const PublicPageInner: React.FC = () => {
  const { locale } = useLocale();
  const { data, isLoading, isError, error, refetch } = usePublicPage(locale);

  const pageTitle = data?.page.title;

  // Update browser document.title with backend page title
  useEffect(() => {
    if (pageTitle) {
      document.title = pageTitle;
    }
  }, [pageTitle]);

  const sortedSections = useMemo(() => {
    if (!data?.sections) return [];
    return [...data.sections].sort((a, b) => a.sort_order - b.sort_order);
  }, [data?.sections]);

  const sectionKeys = useMemo(
    () => sortedSections.map((section) => section.key),
    [sortedSections],
  );

  const activeSectionKey = useActiveSection(sectionKeys);

  if (isLoading) {
    return (
      <div className={styles.stateContainer}>
        <LoadingSpinner label={t(locale, "common", "loadingPage")} />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className={styles.stateContainer}>
        <ErrorMessage
          error={error || t(locale, "common", "errorLoadingPage")}
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  const appearance = data.appearance;
  const mode = appearance?.background_mode ?? "none";

  const backgroundStyle: React.CSSProperties = {};
  let showOverlay = false;

  if (mode === "color") {
    backgroundStyle.backgroundColor = appearance.background_color;
  } else if (mode === "image") {
    backgroundStyle.backgroundColor = appearance.background_color;
    if (appearance.background_media) {
      backgroundStyle.backgroundImage = `url(${appearance.background_media.url})`;
      backgroundStyle.backgroundPosition = appearance.background_position;
      backgroundStyle.backgroundSize = appearance.background_size;
      backgroundStyle.backgroundRepeat = "no-repeat";
      showOverlay = true;
    }
  }

  return (
    <div
      className={styles.pageWrapper}
      style={backgroundStyle}
      data-testid="public-page-wrapper"
    >
      {showOverlay && (
        <div
          className={styles.pageOverlay}
          style={{ opacity: appearance.overlay_opacity }}
          aria-hidden="true"
          data-testid="public-page-overlay"
        />
      )}

      <PublicHeader
        siteTitle={data.page.title}
        sections={sortedSections}
        activeSectionKey={activeSectionKey}
      />

      <main id="top" className={styles.mainContent}>
        {sortedSections.length > 0 ? (
          sortedSections.map((section) => (
            <PublicSection
              key={section.id}
              section={section}
              testimonials={data.testimonials}
            />
          ))
        ) : (
          <div className={styles.emptyPageState}>
            <h2>{t(locale, "common", "noContentTitle")}</h2>
            <p>{t(locale, "common", "noContentBody")}</p>
          </div>
        )}
      </main>

      <footer className={styles.footer}>
        <p>
          &copy; {new Date().getFullYear()} {data.page.title}.{" "}
          {t(locale, "common", "allRightsReserved")}
        </p>
      </footer>
    </div>
  );
};

export const PublicPage: React.FC = () => {
  return (
    <LocaleProvider>
      <PublicPageInner />
    </LocaleProvider>
  );
};

export default PublicPage;
