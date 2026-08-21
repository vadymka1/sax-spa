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
        padding: "1.5rem",
        borderRadius: "8px",
        backgroundColor: "#fff5f5",
        border: "1px solid #feb2b2",
        color: "#c53030",
        margin: "1rem 0",
      }}
    >
      <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.1rem" }}>
        {code ? `Error (${code})` : "An Error Occurred"}
      </h3>
      <p style={{ margin: 0, fontSize: "0.95rem" }}>{message}</p>
      {requestId && (
        <p
          style={{
            margin: "0.5rem 0 0 0",
            fontSize: "0.8rem",
            color: "#742a2a",
            fontFamily: "monospace",
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
            padding: "0.4rem 0.8rem",
            backgroundColor: "#c53030",
            color: "#ffffff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "0.9rem",
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
};
