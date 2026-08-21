import React, { useRef } from "react";
import { AdminSpaSectionDto } from "../../../api/types";
import { useDeleteSpaSection } from "./sectionQueries";
import { FocusRestoreTarget, useAdminDialog } from "./useAdminDialog";
import { ErrorMessage } from "../../../components/common/ErrorMessage";
import styles from "./sections.module.css";

interface SpaSectionDeleteModalProps {
  section: AdminSpaSectionDto | null;
  isOpen: boolean;
  onClose: () => void;
  fallbackFocusRef?: React.RefObject<HTMLElement | null>;
}

export const SpaSectionDeleteModal: React.FC<SpaSectionDeleteModalProps> = ({
  section,
  isOpen,
  onClose,
  fallbackFocusRef,
}) => {
  const deleteMutation = useDeleteSpaSection();
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);

  const { dialogRef, prepareFocusRestore } = useAdminDialog({
    isOpen: isOpen && section !== null,
    onClose,
    isSubmitting: deleteMutation.isPending,
    initialFocusRef: cancelButtonRef,
    fallbackFocusRef,
  });

  if (!isOpen || !section) {
    return null;
  }

  const handleClose = (target: FocusRestoreTarget = "trigger") => {
    prepareFocusRestore(target);
    onClose();
  };

  const handleDelete = async () => {
    if (deleteMutation.isPending) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(section.id);
      prepareFocusRestore("fallback");
      onClose();
    } catch {
      // Error caught and displayed by ErrorMessage
    }
  };

  return (
    <div
      className={styles.modalBackdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-section-dialog-title"
    >
      <div ref={dialogRef} className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3 id="delete-section-dialog-title" className={styles.modalTitle}>
            Delete Section
          </h3>
          <button
            type="button"
            className={styles.closeButton}
            onClick={() => handleClose("trigger")}
            disabled={deleteMutation.isPending}
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        <div className={styles.modalBody}>
          {deleteMutation.error && (
            <ErrorMessage error={deleteMutation.error} />
          )}

          <p style={{ margin: 0, color: "var(--color-text)", lineHeight: 1.5 }}>
            Are you sure you want to delete section{" "}
            <strong>&quot;{section.title}&quot;</strong> (key:{" "}
            <code>{section.key}</code>)?
          </p>
          <p className={styles.helperText}>
            This action cannot be undone. Backend business rules will prevent
            deletion if this section contains content blocks.
          </p>
        </div>

        <div className={styles.modalFooter}>
          <button
            ref={cancelButtonRef}
            type="button"
            className={styles.secondaryButton}
            onClick={() => handleClose("trigger")}
            disabled={deleteMutation.isPending}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.dangerButton}
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete Section"}
          </button>
        </div>
      </div>
    </div>
  );
};
