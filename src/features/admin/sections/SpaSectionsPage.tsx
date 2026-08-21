import React, { useRef, useState } from "react";
import { AdminSpaSectionDto } from "../../../api/types";
import { useAdminSpaSections } from "./sectionQueries";
import { LoadingSpinner } from "../../../components/common/LoadingSpinner";
import { ErrorMessage } from "../../../components/common/ErrorMessage";
import { SpaSectionsList } from "./SpaSectionsList";
import { SpaSectionCreateModal } from "./SpaSectionCreateModal";
import { SpaSectionEditModal } from "./SpaSectionEditModal";
import { SpaSectionDeleteModal } from "./SpaSectionDeleteModal";
import styles from "./sections.module.css";

export const SpaSectionsPage: React.FC = () => {
  const { data: sections, isLoading, error, refetch } = useAdminSpaSections();
  const createSectionButtonRef = useRef<HTMLButtonElement | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSection, setEditingSection] =
    useState<AdminSpaSectionDto | null>(null);
  const [deletingSection, setDeletingSection] =
    useState<AdminSpaSectionDto | null>(null);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>SPA Sections</h2>
          <p className={styles.subtitle}>
            Manage dynamic sections displayed on the public single-page
            application.
          </p>
        </div>
        <button
          ref={createSectionButtonRef}
          type="button"
          className={styles.createButton}
          onClick={() => setIsCreateOpen(true)}
        >
          Create Section
        </button>
      </header>

      {isLoading && (
        <div className={styles.card}>
          <LoadingSpinner label="Loading SPA sections..." />
        </div>
      )}

      {error && (
        <div className={styles.card}>
          <ErrorMessage error={error} onRetry={() => refetch()} />
        </div>
      )}

      {!isLoading && !error && sections && sections.length === 0 && (
        <div className={styles.emptyState}>
          <h3 className={styles.emptyTitle}>No sections yet</h3>
          <p className={styles.emptyDescription}>
            Create the first section to start building the public page layout.
          </p>
          <button
            type="button"
            className={styles.createButton}
            onClick={() => setIsCreateOpen(true)}
          >
            Create Section
          </button>
        </div>
      )}

      {!isLoading && !error && sections && sections.length > 0 && (
        <SpaSectionsList
          sections={sections}
          onEdit={(section) => setEditingSection(section)}
          onDelete={(section) => setDeletingSection(section)}
        />
      )}

      <SpaSectionCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />

      <SpaSectionEditModal
        section={editingSection}
        isOpen={editingSection !== null}
        onClose={() => setEditingSection(null)}
      />

      <SpaSectionDeleteModal
        section={deletingSection}
        isOpen={deletingSection !== null}
        onClose={() => setDeletingSection(null)}
        fallbackFocusRef={createSectionButtonRef}
      />
    </div>
  );
};
