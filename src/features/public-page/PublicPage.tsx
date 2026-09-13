import React, { useEffect, useMemo } from "react";
import { usePublicPage } from "../../hooks/usePublicPage";
import { useActiveSection } from "../../hooks/useActiveSection";
import { PublicHeader } from "./PublicHeader";
import { PublicSection } from "./PublicSection";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import styles from "./PublicPage.module.css";

export const PublicPage: React.FC = () => {
  const { data, isLoading, isError, error, refetch } = usePublicPage();

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
        <LoadingSpinner label="Loading page content..." />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className={styles.stateContainer}>
        <ErrorMessage
          error={error || "Failed to load public page"}
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
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
            <h2>No Content Available</h2>
            <p>No content is available yet.</p>
          </div>
        )}
      </main>

      <footer className={styles.footer}>
        <p>
          &copy; {new Date().getFullYear()} {data.page.title}. All rights
          reserved.
        </p>
      </footer>
    </div>
  );
};

export default PublicPage;
