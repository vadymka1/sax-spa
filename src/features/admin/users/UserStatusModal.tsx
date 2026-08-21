import React, { useRef } from "react";
import { UserDto } from "../../../api/types";
import { AppApiError } from "../../../api/errors";
import { useAuth } from "../../auth/useAuth";
import { useAdminDialog } from "../sections/useAdminDialog";
import { ErrorMessage } from "../../../components/common/ErrorMessage";
import styles from "./users.module.css";

interface UserStatusModalProps {
  user: UserDto | null;
  targetState: boolean; // true = activate, false = deactivate
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isSubmitting: boolean;
  error?: AppApiError | string | null;
}

export const UserStatusModal: React.FC<UserStatusModalProps> = ({
  user,
  targetState,
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
  error,
}) => {
  const { user: currentUser } = useAuth();
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  const { dialogRef } = useAdminDialog({
    isOpen,
    onClose,
    isSubmitting,
    initialFocusRef: confirmBtnRef,
  });

  if (!isOpen || !user) {
    return null;
  }

  const isSelf = currentUser?.id === user.id;
  const isDeactivatingSelf = isSelf && !targetState;

  return (
    <div
      className={styles.modalBackdrop}
      onClick={() => {
        if (!isSubmitting) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="status-user-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h2 id="status-user-modal-title" className={styles.modalTitle}>
            {targetState ? "Activate User" : "Deactivate User"}
          </h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close dialog"
            disabled={isSubmitting}
          >
            &times;
          </button>
        </div>

        <div className={styles.modalBody}>
          {error && <ErrorMessage error={error} />}

          {isDeactivatingSelf && (
            <div className={styles.warningNotice}>
              <strong>Warning:</strong> You cannot deactivate your own active
              session.
            </div>
          )}

          <p
            style={{
              margin: 0,
              color: "var(--color-admin-text)",
              fontSize: "1rem",
            }}
          >
            {targetState
              ? `Are you sure you want to activate ${user.display_name} (${user.email})?`
              : `Are you sure you want to deactivate ${user.display_name} (${user.email})?`}
          </p>

          {!targetState && (
            <p
              style={{
                margin: 0,
                color: "var(--color-admin-text-muted)",
                fontSize: "0.9rem",
              }}
            >
              This user will no longer be able to sign in to the application.
            </p>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            className={
              targetState ? styles.activateButton : styles.dangerButton
            }
            onClick={onConfirm}
            disabled={isSubmitting || isDeactivatingSelf}
          >
            {isSubmitting
              ? targetState
                ? "Activating..."
                : "Deactivating..."
              : targetState
                ? "Activate"
                : "Deactivate"}
          </button>
        </div>
      </div>
    </div>
  );
};
