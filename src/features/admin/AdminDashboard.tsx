import React from "react";
import { useAuth } from "../auth/useAuth";
import styles from "./adminLayout.module.css";

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className={styles.dashboardCard}>
      <h2 className={styles.dashboardTitle}>Admin Dashboard</h2>
      <p className={styles.dashboardText}>
        Welcome to the SPA Saxophone Ensemble CMS administration panel.
      </p>

      {user && (
        <div style={{ marginTop: "1.5rem" }}>
          <p style={{ margin: "0.25rem 0", color: "var(--color-text)" }}>
            <strong>Signed in as:</strong> {user.email}
          </p>
          <p style={{ margin: "0.25rem 0", color: "var(--color-text)" }}>
            <strong>Display Name:</strong> {user.display_name}
          </p>
          <p style={{ margin: "0.25rem 0", color: "var(--color-text)" }}>
            <strong>Administrative Role:</strong> {user.role}
          </p>
        </div>
      )}
    </div>
  );
};
