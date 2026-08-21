import React from "react";
import { UserDto } from "../../../api/types";
import styles from "./users.module.css";

interface UsersListProps {
  users: UserDto[];
  onEdit: (user: UserDto) => void;
  onToggleStatus: (user: UserDto) => void;
}

export const UsersList: React.FC<UsersListProps> = ({
  users,
  onEdit,
  onToggleStatus,
}) => {
  const formatDate = (dateString?: string | null) => {
    if (!dateString) {
      return "Never";
    }
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>User</th>
            <th>Role</th>
            <th>Status</th>
            <th>Last Login</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>
                <div className={styles.userName}>{u.display_name}</div>
                <div className={styles.userEmail}>{u.email}</div>
              </td>
              <td>
                <span
                  className={`${styles.badge} ${
                    u.role === "super_admin"
                      ? styles.badgeSuperAdmin
                      : styles.badgeAdmin
                  }`}
                >
                  {u.role === "super_admin" ? "Super Admin" : "Admin"}
                </span>
              </td>
              <td>
                <span
                  className={`${styles.badge} ${
                    u.is_active ? styles.badgeActive : styles.badgeInactive
                  }`}
                >
                  {u.is_active ? "Active" : "Inactive"}
                </span>
              </td>
              <td
                style={{
                  fontSize: "0.875rem",
                  color: "var(--color-admin-text-muted)",
                }}
              >
                {formatDate(u.last_login_at)}
              </td>
              <td>
                <div className={styles.actionGroup}>
                  <button
                    type="button"
                    className={styles.editButton}
                    onClick={() => onEdit(u)}
                    aria-label={`Edit ${u.display_name}`}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className={
                      u.is_active
                        ? styles.deactivateButton
                        : styles.activateButton
                    }
                    onClick={() => onToggleStatus(u)}
                    aria-label={`${u.is_active ? "Deactivate" : "Activate"} ${u.display_name}`}
                  >
                    {u.is_active ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
