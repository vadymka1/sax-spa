import React, { useRef } from "react";
import { AdminTestimonialDto } from "../../../api/types";
import { useAdminDialog } from "../sections/useAdminDialog";
import { useDeleteTestimonial } from "./testimonialQueries";
import { ErrorMessage } from "../../../components/common/ErrorMessage";
import styles from "./testimonials.module.css";

interface TestimonialDeleteModalProps {
  testimonial: AdminTestimonialDto | null;
  isOpen: boolean;
  onClose: () => void;
  fallbackFocusRef?: React.RefObject<HTMLElement | null>;
}

export const TestimonialDeleteModal: React.FC<TestimonialDeleteModalProps> = ({
  testimonial,
  isOpen,
  onClose,
  fallbackFocusRef,
}) => {
  const deleteMutation = useDeleteTestimonial();
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);

  const { dialogRef, prepareFocusRestore } = useAdminDialog({
    isOpen: isOpen && testimonial !== null,
    onClose,
    isSubmitting: deleteMutation.isPending,
    initialFocusRef: cancelButtonRef,
    fallbackFocusRef,
  });

  if (!isOpen || !testimonial) {
    return null;
  }

  const handleDelete = async () => {
    if (deleteMutation.isPending) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(testimonial.id);
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
      aria-labelledby="delete-testimonial-dialog-title"
    >
      <div ref={dialogRef} className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3
            id="delete-testimonial-dialog-title"
            className={styles.modalTitle}
          >
            Delete Testimonial
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

          <p
            style={{
              margin: 0,
              color: "var(--color-admin-text)",
              lineHeight: 1.5,
            }}
          >
            Are you sure you want to delete the testimonial by{" "}
            <strong>&quot;{testimonial.author_name}&quot;</strong>?
          </p>
          <p className={styles.helperText}>
            This action cannot be undone. The testimonial will be permanently
            removed from the system.
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
            {deleteMutation.isPending ? "Deleting..." : "Delete Testimonial"}
          </button>
        </div>
      </div>
    </div>
  );
};
