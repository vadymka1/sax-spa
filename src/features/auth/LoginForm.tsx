import React, { FormEvent, useState } from "react";
import { AppApiError } from "../../api/errors";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { useAuth } from "./useAuth";
import styles from "./auth.module.css";

interface LoginFormProps {
  onSuccess: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<AppApiError | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await login({ email, password });
      onSuccess();
    } catch (err) {
      setError(err as AppApiError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className={styles.loginForm} onSubmit={handleSubmit}>
      {error && (
        <div className={styles.errorBanner} aria-live="polite">
          <ErrorMessage error={error} />
        </div>
      )}

      <div className={styles.formGroup}>
        <label htmlFor="admin-email-input" className={styles.label}>
          Email Address
        </label>
        <input
          id="admin-email-input"
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          required
          disabled={isSubmitting}
          className={styles.input}
          placeholder="admin@example.com"
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="admin-password-input" className={styles.label}>
          Password
        </label>
        <input
          id="admin-password-input"
          type="password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          disabled={isSubmitting}
          className={styles.input}
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className={styles.submitButton}
      >
        {isSubmitting ? "Signing in..." : "Sign In to CMS"}
      </button>
    </form>
  );
};
