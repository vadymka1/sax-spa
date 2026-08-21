import React, { useRef, useState } from "react";
import {
  AdminRole,
  AdminRoleSchema,
  CreateUserRequest,
  PASSWORD_MIN_LENGTH,
} from "../../../api/types";
import { AppApiError } from "../../../api/errors";
import { useAdminDialog } from "../sections/useAdminDialog";
import { ErrorMessage } from "../../../components/common/ErrorMessage";
import styles from "./users.module.css";

interface UserCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateUserRequest) => Promise<void>;
  isSubmitting: boolean;
  error?: AppApiError | string | null;
}

export const UserCreateModal: React.FC<UserCreateModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  error,
}) => {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<AdminRole>("admin");
  const [password, setPassword] = useState("");
  const [isActive, setIsActive] = useState(true);

  const emailInputRef = useRef<HTMLInputElement>(null);

  const { dialogRef } = useAdminDialog({
    isOpen,
    onClose,
    isSubmitting,
    initialFocusRef: emailInputRef,
  });

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < PASSWORD_MIN_LENGTH) {
      return;
    }
    await onSubmit({
      email,
      display_name: displayName,
      role,
      password,
      is_active: isActive,
    });
    // Immediately clear password from local state
    setPassword("");
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const result = AdminRoleSchema.safeParse(e.target.value);
    if (result.success) {
      setRole(result.data);
    }
  };

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
        aria-labelledby="create-user-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h2 id="create-user-modal-title" className={styles.modalTitle}>
            Create User
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
            {error && <ErrorMessage error={error} />}

            <div className={styles.formGroup}>
              <label htmlFor="create-user-email" className={styles.label}>
                Email Address
              </label>
              <input
                id="create-user-email"
                ref={emailInputRef}
                type="email"
                className={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="off"
                disabled={isSubmitting}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="create-user-name" className={styles.label}>
                Display Name
              </label>
              <input
                id="create-user-name"
                type="text"
                className={styles.input}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="create-user-role" className={styles.label}>
                Role
              </label>
              <select
                id="create-user-role"
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
              <label htmlFor="create-user-password" className={styles.label}>
                Password
              </label>
              <input
                id="create-user-password"
                type="password"
                className={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={PASSWORD_MIN_LENGTH}
                autoComplete="new-password"
                disabled={isSubmitting}
              />
              <span className={styles.helperText}>
                Password must be at least {PASSWORD_MIN_LENGTH} characters.
              </span>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  disabled={isSubmitting}
                />
                Account Active
              </label>
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
              className={styles.createButton}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
