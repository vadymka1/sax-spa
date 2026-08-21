import React, { useEffect, useRef, useState } from "react";
import {
  AdminRole,
  AdminRoleSchema,
  UpdateUserRequest,
  UserDto,
} from "../../../api/types";
import { AppApiError } from "../../../api/errors";
import { useAuth } from "../../auth/useAuth";
import { useAdminDialog } from "../sections/useAdminDialog";
import { ErrorMessage } from "../../../components/common/ErrorMessage";
import styles from "./users.module.css";

interface UserEditModalProps {
  user: UserDto | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (id: string, payload: UpdateUserRequest) => Promise<void>;
  isSubmitting: boolean;
  error?: AppApiError | string | null;
}

export const UserEditModal: React.FC<UserEditModalProps> = ({
  user,
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  error,
}) => {
  const { user: currentUser } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<AdminRole>("admin");
  const [isActive, setIsActive] = useState(true);
  const [confirmDemotion, setConfirmDemotion] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);

  const { dialogRef } = useAdminDialog({
    isOpen,
    onClose,
    isSubmitting,
    initialFocusRef: nameInputRef,
  });

  useEffect(() => {
    if (isOpen && user) {
      setDisplayName(user.display_name);
      setRole(user.role);
      setIsActive(user.is_active);
      setConfirmDemotion(false);
      setLocalError(null);
    }
  }, [isOpen, user]);

  if (!isOpen || !user) {
    return null;
  }

  const isSelfEdit = currentUser?.id === user.id;
  const isSelfDemoting =
    isSelfEdit && user.role === "super_admin" && role === "admin";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    // Submission-level safety guard against self-deactivation
    if (isSelfEdit && !isActive) {
      setLocalError("You cannot deactivate your own active session.");
      return;
    }

    if (isSelfDemoting && !confirmDemotion) {
      setConfirmDemotion(true);
      return;
    }

    await onSubmit(user.id, {
      display_name: displayName,
      role,
      is_active: isActive,
    });
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const result = AdminRoleSchema.safeParse(e.target.value);
    if (result.success) {
      setRole(result.data);
      setConfirmDemotion(false);
    }
  };

  const effectiveError = localError || error;

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
        aria-labelledby="edit-user-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h2 id="edit-user-modal-title" className={styles.modalTitle}>
            Edit User
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

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            {effectiveError && <ErrorMessage error={effectiveError} />}

            {isSelfDemoting && (
              <div className={styles.warningNotice}>
                <strong>Warning:</strong> You are demoting your own account from
                Super Admin to Admin. You will immediately lose access to user
                management.
              </div>
            )}

            {isSelfEdit && (
              <div className={styles.warningNotice}>
                You cannot deactivate your own active session.
              </div>
            )}

            <div className={styles.formGroup}>
              <label htmlFor="edit-user-email" className={styles.label}>
                Email Address
              </label>
              <input
                id="edit-user-email"
                type="email"
                className={styles.input}
                value={user.email}
                disabled
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="edit-user-name" className={styles.label}>
                Display Name
              </label>
              <input
                id="edit-user-name"
                ref={nameInputRef}
                type="text"
                className={styles.input}
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  setConfirmDemotion(false);
                }}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="edit-user-role" className={styles.label}>
                Role
              </label>
              <select
                id="edit-user-role"
                className={styles.select}
                value={role}
                onChange={handleRoleChange}
                disabled={isSubmitting}
              >
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={isSelfEdit ? true : isActive}
                  onChange={(e) => {
                    if (!isSelfEdit) {
                      setIsActive(e.target.checked);
                      setConfirmDemotion(false);
                    }
                  }}
                  disabled={isSubmitting || isSelfEdit}
                />
                Account Active
              </label>
              {isSelfEdit && (
                <span className={styles.helperText}>
                  Account Active status is locked for your own account.
                </span>
              )}
            </div>
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
              type="submit"
              className={
                isSelfDemoting ? styles.dangerButton : styles.createButton
              }
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Saving..."
                : isSelfDemoting && !confirmDemotion
                  ? "Confirm Self-Demotion"
                  : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
