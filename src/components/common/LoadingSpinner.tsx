import React from "react";

interface LoadingSpinnerProps {
  label?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  label = "Loading...",
}) => {
  return (
    <div
      role="status"
      aria-label={label}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        gap: "0.75rem",
      }}
    >
      <div
        style={{
          width: "32px",
          height: "32px",
          border: "3px solid #e0e0e0",
          borderTopColor: "#0066cc",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <span style={{ fontSize: "0.9rem", color: "#555" }}>{label}</span>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
