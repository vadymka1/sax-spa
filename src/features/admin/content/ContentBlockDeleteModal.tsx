import React, { useRef } from "react";
import { AdminContentBlockDto } from "../../../api/types";
import { useAdminDialog } from "../sections/useAdminDialog";
import { useDeleteContentBlock } from "./contentQueries";
import { ErrorMessage } from "../../../components/common/ErrorMessage";
import styles from "./content.module.css";

interface ContentBlockDeleteModalProps {
  block: AdminContentBlockDto | null;
  spaSectionId: string;
  isOpen: boolean;
  onClose: () => void;
  fallbackFocusRef?: React.RefObject<HTMLElement | null>;
}

export const ContentBlockDeleteModal: React.FC<
  ContentBlockDeleteModalProps
> = ({ block, spaSectionId, isOpen, onClose, fallbackFocusRef }) => {
  const deleteMutation = useDeleteContentBlock(spaSectionId);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);

  const { dialogRef, prepareFocusRestore } = useAdminDialog({
    isOpen: isOpen && block !== null,
    onClose,
    isSubmitting: deleteMutation.isPending,
    initialFocusRef: cancelButtonRef,
    fallbackFocusRef,
  });

  if (!isOpen || !block) {
    return null;
  }

  const handleDelete = async () => {
    if (deleteMutation.isPending) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(block.id);
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
      aria-labelledby="delete-block-dialog-title"
    >
      <div ref={dialogRef} className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3 id="delete-block-dialog-title" className={styles.modalTitle}>
            Delete Content Block
          </h3>
          <button
            type="button"
            className={styles.closeButton}
            onClick={() => {
              prepareFocusRestore("trigger");
              onClose();
            }}
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
            Are you sure you want to delete content block{" "}
            <strong>
              &quot;{block.title || `Block #${block.sort_order}`}&quot;
            </strong>{" "}
            ({block.block_type})?
          </p>
          <p className={styles.helperText}>
            This action cannot be undone. Attached media assets will remain
            intact in the backend media library.
          </p>
        </div>

        <div className={styles.modalFooter}>
          <button
            ref={cancelButtonRef}
            type="button"
            className={styles.secondaryButton}
            onClick={() => {
              prepareFocusRestore("trigger");
              onClose();
            }}
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
            {deleteMutation.isPending ? "Deleting..." : "Delete Block"}
          </button>
        </div>
      </div>
    </div>
  );
};
