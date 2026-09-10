import React, { useRef, useState } from "react";
import { useCreateSpaSection } from "./sectionQueries";
import { useAdminDialog } from "./useAdminDialog";
import { ErrorMessage } from "../../../components/common/ErrorMessage";
import styles from "./sections.module.css";

interface SpaSectionCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SpaSectionCreateModal: React.FC<SpaSectionCreateModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [title, setTitle] = useState("");
  const [navigationLabel, setNavigationLabel] = useState("");
  const createMutation = useCreateSpaSection();
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const isSubmittingRef = useRef(false);

  const { dialogRef } = useAdminDialog({
    isOpen,
    onClose,
    isSubmitting: createMutation.isPending,
    initialFocusRef: titleInputRef,
  });

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle || createMutation.isPending || isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    try {
      await createMutation.mutateAsync({
        title: trimmedTitle,
        navigation_label: navigationLabel.trim() || undefined,
      });
      setTitle("");
      setNavigationLabel("");
      onClose();
    } catch {
      // Error is caught and displayed by ErrorMessage without resetting form draft
    } finally {
      isSubmittingRef.current = false;
    }
  };

  return (
    <div
      className={styles.modalBackdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-section-dialog-title"
    >
      <div ref={dialogRef} className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3 id="create-section-dialog-title" className={styles.modalTitle}>
            Create SPA Section
          </h3>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            disabled={createMutation.isPending}
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.modalBody}>
            {createMutation.error && (
              <ErrorMessage error={createMutation.error} />
            )}

            <div className={styles.formGroup}>
              <label htmlFor="create-section-title" className={styles.label}>
                Section Title *
              </label>
              <input
                ref={titleInputRef}
                id="create-section-title"
                type="text"
                className={styles.input}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Festival 2027"
                required
                disabled={createMutation.isPending}
              />
            </div>

            <div className={styles.formGroup}>
              <label
                htmlFor="create-section-nav-label"
                className={styles.label}
              >
                Navigation Label (Optional)
              </label>
              <input
                id="create-section-nav-label"
                type="text"
                className={styles.input}
                value={navigationLabel}
                onChange={(e) => setNavigationLabel(e.target.value)}
                placeholder="e.g. Festival"
                disabled={createMutation.isPending}
              />
              <span className={styles.helperText}>
                Defaults to section title if left blank.
              </span>
            </div>

            <div className={styles.formGroup}>
              <span className={styles.label}>Section Key</span>
              <span className={styles.helperText}>
                The section key is generated automatically by the server upon
                creation.
              </span>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={onClose}
              disabled={createMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.createButton}
              disabled={createMutation.isPending || !title.trim()}
            >
              {createMutation.isPending ? "Creating..." : "Create Section"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
