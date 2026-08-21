import React, { useState } from "react";
import {
  CreateUserRequest,
  UpdateUserRequest,
  UserDto,
} from "../../../api/types";
import { AppApiError, normalizeApiError } from "../../../api/errors";
import { useAuth } from "../../auth/useAuth";
import { ErrorMessage } from "../../../components/common/ErrorMessage";
import { LoadingSpinner } from "../../../components/common/LoadingSpinner";
import { useAdminUsers, useCreateUser, useUpdateUser } from "./userQueries";
import { UserCreateModal } from "./UserCreateModal";
import { UserEditModal } from "./UserEditModal";
import { UserStatusModal } from "./UserStatusModal";
import { UsersList } from "./UsersList";
import { getUserUpdateSafetyError } from "./userUpdateSafety";
import styles from "./users.module.css";

export const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { data: users, isLoading, error, refetch } = useAdminUsers();
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserDto | null>(null);
  const [statusUser, setStatusUser] = useState<{
    user: UserDto;
    targetState: boolean;
  } | null>(null);

  const [createError, setCreateError] = useState<AppApiError | string | null>(
    null,
  );
  const [editError, setEditError] = useState<AppApiError | string | null>(null);
  const [statusError, setStatusError] = useState<AppApiError | string | null>(
    null,
  );

  const handleCreateSubmit = async (payload: CreateUserRequest) => {
    setCreateError(null);
    try {
      await createUserMutation.mutateAsync(payload);
      setIsCreateOpen(false);
    } catch (err: unknown) {
      setCreateError(normalizeApiError(err));
    }
  };

  const handleEditSubmit = async (id: string, payload: UpdateUserRequest) => {
    setEditError(null);

    // Pure submission-level safety guard: block PATCH if self-deactivation is attempted
    const safetyError = getUserUpdateSafetyError(currentUser?.id, id, payload);
    if (safetyError) {
      setEditError(safetyError);
      return;
    }

    try {
      await updateUserMutation.mutateAsync({ id, payload });
      setEditingUser(null);
    } catch (err: unknown) {
      setEditError(normalizeApiError(err));
    }
  };

  const handleStatusConfirm = async () => {
    if (!statusUser) {
      return;
    }
    setStatusError(null);

    const payload: UpdateUserRequest = { is_active: statusUser.targetState };
    // Pure submission-level safety guard: block status change if self-deactivation is attempted
    const safetyError = getUserUpdateSafetyError(
      currentUser?.id,
      statusUser.user.id,
      payload,
    );
    if (safetyError) {
      setStatusError(safetyError);
      return;
    }

    try {
      await updateUserMutation.mutateAsync({
        id: statusUser.user.id,
        payload,
      });
      setStatusUser(null);
    } catch (err: unknown) {
      setStatusError(normalizeApiError(err));
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Users</h1>
          <p className={styles.subtitle}>
            Manage system administrators and roles.
          </p>
        </div>

        <button
          type="button"
          className={styles.createButton}
          onClick={() => {
            setCreateError(null);
            setIsCreateOpen(true);
          }}
        >
          + Create User
        </button>
      </div>

      {isLoading && (
        <div className={styles.card}>
          <LoadingSpinner label="Loading users..." />
        </div>
      )}

      {error && <ErrorMessage error={error} onRetry={() => refetch()} />}

      {!isLoading && !error && users && users.length === 0 && (
        <div className={styles.emptyState}>
          <h2 className={styles.emptyTitle}>No users found</h2>
          <p className={styles.emptyDescription}>
            Get started by creating your first system administrator.
          </p>
          <button
            type="button"
            className={styles.createButton}
            onClick={() => {
              setCreateError(null);
              setIsCreateOpen(true);
            }}
          >
            Create User
          </button>
        </div>
      )}

      {!isLoading && !error && users && users.length > 0 && (
        <div className={styles.card}>
          <UsersList
            users={users}
            onEdit={(user) => {
              setEditError(null);
              setEditingUser(user);
            }}
            onToggleStatus={(user) => {
              setStatusError(null);
              setStatusUser({ user, targetState: !user.is_active });
            }}
          />
        </div>
      )}

      <UserCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateSubmit}
        isSubmitting={createUserMutation.isPending}
        error={createError}
      />

      <UserEditModal
        user={editingUser}
        isOpen={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
        onSubmit={handleEditSubmit}
        isSubmitting={updateUserMutation.isPending}
        error={editError}
      />

      <UserStatusModal
        user={statusUser?.user ?? null}
        targetState={statusUser?.targetState ?? true}
        isOpen={Boolean(statusUser)}
        onClose={() => setStatusUser(null)}
        onConfirm={handleStatusConfirm}
        isSubmitting={updateUserMutation.isPending}
        error={statusError}
      />
    </div>
  );
};
