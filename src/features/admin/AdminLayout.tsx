import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import styles from "./adminLayout.module.css";

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }
    setIsLoggingOut(true);
    try {
      await logout();
    } catch {
      // Ignore network/server logout failure; local session clearing is authoritative
    } finally {
      navigate("/admin/login", { replace: true });
    }
  };

  return (
    <div className={styles.adminShell}>
      <header className={styles.adminHeader}>
        <div className={styles.brand}>
          <h1 className={styles.brandTitle}>SPA Saxophone CMS</h1>
          <nav className={styles.navMenu} aria-label="Admin Navigation">
            <NavLink
              to="/admin"
              end
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.activeNavLink : ""}`
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/admin/sections"
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.activeNavLink : ""}`
              }
            >
              Sections
            </NavLink>
            <NavLink
              to="/admin/content"
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.activeNavLink : ""}`
              }
            >
              Content
            </NavLink>
          </nav>
        </div>

        {user && (
          <div className={styles.userNav}>
            <div className={styles.userInfo}>
              <span className={styles.userEmail}>
                {user.display_name || user.email}
              </span>
              <span className={styles.roleBadge}>{user.role}</span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className={styles.logoutButton}
            >
              {isLoggingOut ? "Logging out..." : "Log Out"}
            </button>
          </div>
        )}
      </header>

      <main className={styles.adminMain}>
        <Outlet />
      </main>
    </div>
  );
};
