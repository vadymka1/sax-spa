import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { LoginForm } from "./LoginForm";
import { useAuth } from "./useAuth";
import styles from "./auth.module.css";

export const LoginPage: React.FC = () => {
  const { status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const intendedDestination =
    (location.state as { from?: Location })?.from?.pathname || "/admin";

  useEffect(() => {
    if (status === "authenticated") {
      navigate(intendedDestination, { replace: true });
    }
  }, [status, navigate, intendedDestination]);

  if (status === "checking") {
    return (
      <main className={styles.loginContainer}>
        <LoadingSpinner label="Checking authentication..." />
      </main>
    );
  }

  return (
    <main className={styles.loginContainer}>
      <div className={styles.loginCard}>
        <h1 className={styles.loginTitle}>SPA Saxophone CMS</h1>
        <p className={styles.loginSubtitle}>
          Sign in to access administration tools
        </p>

        <LoginForm
          onSuccess={() => {
            navigate(intendedDestination, { replace: true });
          }}
        />
      </div>
    </main>
  );
};
