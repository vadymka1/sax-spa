import React from "react";
import { AppApiError } from "../../api/errors";

interface ErrorMessageProps {
  error: AppApiError | string;
  onRetry?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  error,
  onRetry,
}) => {
  const message = typeof error === "string" ? error : error.message;
  const requestId = typeof error === "object" ? error.requestId : undefined;
  const code = typeof error === "object" ? error.code : undefined;

  return (
    <div
      role="alert"
      style={{
        padding: "1.25rem 1.5rem",
        borderRadius: "var(--radius-md)",
        backgroundColor: "var(--color-admin-danger-soft)",
        border: "1px solid var(--color-admin-danger-border)",
        color: "var(--color-admin-danger)",
        margin: "1rem 0",
      }}
    >
      <h3
        style={{ margin: "0 0 0.5rem 0", fontSize: "1.05rem", fontWeight: 700 }}
      >
        {code ? `Error (${code})` : "An Error Occurred"}
      </h3>
      <p style={{ margin: 0, fontSize: "0.95rem", lineHeight: 1.5 }}>
        {message}
      </p>
      {requestId && (
        <p
          style={{
            margin: "0.5rem 0 0 0",
            fontSize: "0.8rem",
            color: "var(--color-admin-danger-hover)",
            fontFamily: "ui-monospace, SFMono-Regular, monospace",
          }}
        >
          Request ID: {requestId}
        </p>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          type="button"
          style={{
            marginTop: "1rem",
            padding: "0.45rem 0.9rem",
            backgroundColor: "var(--color-admin-danger)",
            color: "#ffffff",
            border: "1px solid var(--color-admin-danger)",
            borderRadius: "var(--radius-sm)",
            cursor: "pointer",
            fontSize: "0.9rem",
            fontWeight: 600,
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
};
