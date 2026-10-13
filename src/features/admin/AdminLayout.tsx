import React, { useState, useEffect, useCallback } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { useAdminContactMessages } from "./contact-messages/contactMessageQueries";
import styles from "./adminLayout.module.css";

interface AdminRouteDef {
  path: string;
  label: string;
  end?: boolean;
  superAdminOnly?: boolean;
  hasUnreadBadge?: boolean;
}

const ADMIN_ROUTES: AdminRouteDef[] = [
  { path: "/admin", label: "Dashboard", end: true },
  { path: "/admin/sections", label: "Sections" },
  { path: "/admin/content", label: "Content" },
  { path: "/admin/testimonials", label: "Testimonials" },
  {
    path: "/admin/contact-messages",
    label: "Contact Messages",
    hasUnreadBadge: true,
  },
  { path: "/admin/page-appearance", label: "Page Appearance" },
  { path: "/admin/users", label: "Users", superAdminOnly: true },
];

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const { data: contactMessages } = useAdminContactMessages();
  const unreadCount = contactMessages?.filter((m) => !m.is_read).length ?? 0;

  const closeDrawer = useCallback(() => {
    setIsMobileDrawerOpen(false);
  }, []);

  // Close drawer on route change
  useEffect(() => {
    setIsMobileDrawerOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile drawer is open and restore on close
  useEffect(() => {
    if (!isMobileDrawerOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow || "";
    };
  }, [isMobileDrawerOpen]);

  // Ensure body scroll lock is always cleared when AdminLayout unmounts
  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Escape key closes mobile drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileDrawerOpen) {
        closeDrawer();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileDrawerOpen, closeDrawer]);

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }
    setIsLoggingOut(true);
    closeDrawer();
    try {
      await logout();
    } catch {
      // Ignore network/server logout failure; local session clearing is authoritative
    } finally {
      navigate("/admin/login", { replace: true });
    }
  };

  const visibleRoutes = ADMIN_ROUTES.filter(
    (route) => !route.superAdminOnly || user?.role === "super_admin",
  );

  return (
    <div className={styles.adminShell}>
      <header className={styles.adminHeader}>
        <div className={styles.brand}>
          <button
            type="button"
            className={styles.mobileMenuButton}
            aria-expanded={isMobileDrawerOpen}
            aria-controls="admin-mobile-drawer"
            aria-label={
              isMobileDrawerOpen ? "Close admin menu" : "Open admin menu"
            }
            onClick={() => setIsMobileDrawerOpen((prev) => !prev)}
          >
            {isMobileDrawerOpen ? "✕" : "☰"}
          </button>
          <h1 className={styles.brandTitle}>SPA Saxophone CMS</h1>
          <nav className={styles.navMenu} aria-label="Admin Navigation">
            {visibleRoutes.map((route) => (
              <NavLink
                key={route.path}
                to={route.path}
                end={route.end}
                className={({ isActive }) =>
                  `${styles.navLink} ${isActive ? styles.activeNavLink : ""}`
                }
              >
                {route.label}
                {route.hasUnreadBadge && unreadCount > 0 && (
                  <span
                    className={styles.navUnreadBadge}
                    aria-label={`${unreadCount} unread messages`}
                  >
                    {unreadCount}
                  </span>
                )}
              </NavLink>
            ))}
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

      {/* Mobile Navigation Drawer Backdrop & Container */}
      {isMobileDrawerOpen && (
        <div
          className={styles.drawerBackdrop}
          onClick={closeDrawer}
          aria-hidden="true"
        />
      )}
      <aside
        id="admin-mobile-drawer"
        className={`${styles.mobileDrawer} ${isMobileDrawerOpen ? styles.mobileDrawerOpen : ""}`}
        aria-label="Admin navigation drawer"
        hidden={!isMobileDrawerOpen}
        aria-hidden={!isMobileDrawerOpen}
      >
        {isMobileDrawerOpen && (
          <>
            <div className={styles.drawerHeader}>
              <span className={styles.drawerTitle}>Admin Navigation</span>
              <button
                type="button"
                className={styles.drawerCloseButton}
                onClick={closeDrawer}
                aria-label="Close admin menu"
              >
                ✕
              </button>
            </div>

            <nav
              className={styles.drawerNavMenu}
              aria-label="Mobile Drawer Navigation"
            >
              {visibleRoutes.map((route) => (
                <NavLink
                  key={route.path}
                  to={route.path}
                  end={route.end}
                  onClick={closeDrawer}
                  className={({ isActive }) =>
                    `${styles.drawerNavLink} ${isActive ? styles.activeDrawerNavLink : ""}`
                  }
                >
                  {route.label}
                  {route.hasUnreadBadge && unreadCount > 0 && (
                    <span
                      className={styles.navUnreadBadge}
                      aria-label={`${unreadCount} unread messages`}
                    >
                      {unreadCount}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>

            {user && (
              <div className={styles.drawerFooter}>
                <div className={styles.drawerUserInfo}>
                  <span className={styles.drawerUserEmail}>
                    {user.display_name || user.email}
                  </span>
                  <span className={styles.roleBadge}>{user.role}</span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className={styles.drawerLogoutButton}
                >
                  {isLoggingOut ? "Logging out..." : "Log Out"}
                </button>
              </div>
            )}
          </>
        )}
      </aside>

      <main className={styles.adminMain}>
        <Outlet />
      </main>
    </div>
  );
};
