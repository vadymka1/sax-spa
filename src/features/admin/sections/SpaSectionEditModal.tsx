import React, { useEffect, useRef, useState } from "react";
import { AdminSpaSectionDto } from "../../../api/types";
import { useUpdateSpaSection } from "./sectionQueries";
import { useAdminDialog } from "./useAdminDialog";
import { ErrorMessage } from "../../../components/common/ErrorMessage";
import styles from "./sections.module.css";

interface SpaSectionEditModalProps {
  section: AdminSpaSectionDto | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SpaSectionEditModal: React.FC<SpaSectionEditModalProps> = ({
  section,
  isOpen,
  onClose,
}) => {
  const [title, setTitle] = useState("");
  const [navigationLabel, setNavigationLabel] = useState("");
  const [isVisible, setIsVisible] = useState(true);
  const updateMutation = useUpdateSpaSection();
  const initialInputRef = useRef<HTMLInputElement | null>(null);

  const { dialogRef } = useAdminDialog({
    isOpen: isOpen && section !== null,
    onClose,
    isSubmitting: updateMutation.isPending,
    initialFocusRef: initialInputRef,
  });

  useEffect(() => {
    if (section) {
      setTitle(section.title);
      setNavigationLabel(section.navigation_label);
      setIsVisible(section.is_visible);
    }
  }, [section]);

  if (!isOpen || !section) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle || updateMutation.isPending) {
      return;
    }

    const payload: {
      title?: string;
      navigation_label?: string;
      is_visible?: boolean;
    } = {
      title: trimmedTitle,
      navigation_label: navigationLabel.trim(),
      is_visible: isVisible,
    };

    try {
      await updateMutation.mutateAsync({ id: section.id, payload });
      onClose();
    } catch {
      // Error is caught and displayed by ErrorMessage without resetting form draft
    }
  };

  return (
    <div
      className={styles.modalBackdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-section-dialog-title"
    >
      <div ref={dialogRef} className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3 id="edit-section-dialog-title" className={styles.modalTitle}>
            Edit SPA Section
          </h3>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            disabled={updateMutation.isPending}
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            {updateMutation.error && (
              <ErrorMessage error={updateMutation.error} />
            )}

            <div className={styles.formGroup}>
              <label htmlFor="edit-section-key" className={styles.label}>
                Section Key (Read-Only)
              </label>
              <input
                id="edit-section-key"
                type="text"
                className={styles.input}
                value={section.key}
                readOnly
                disabled
              />
              <span className={styles.helperText}>
                Section key is immutable and used for public page anchors.
              </span>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="edit-section-title" className={styles.label}>
                Section Title *
              </label>
              <input
                ref={initialInputRef}
                id="edit-section-title"
                type="text"
                className={styles.input}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={updateMutation.isPending}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="edit-section-nav-label" className={styles.label}>
                Navigation Label
              </label>
              <input
                id="edit-section-nav-label"
                type="text"
                className={styles.input}
                value={navigationLabel}
                onChange={(e) => setNavigationLabel(e.target.value)}
                disabled={updateMutation.isPending}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={isVisible}
                  onChange={(e) => setIsVisible(e.target.checked)}
                  disabled={updateMutation.isPending}
                />
                Section Visible on Public Page
              </label>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={onClose}
              disabled={updateMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.createButton}
              disabled={updateMutation.isPending || !title.trim()}
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
