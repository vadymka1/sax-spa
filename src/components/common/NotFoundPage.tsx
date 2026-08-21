import React from "react";

export const NotFoundPage: React.FC = () => (
  <main
    style={{
      padding: "4rem 2rem",
      textAlign: "center",
      minHeight: "60vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>
      404 - Page Not Found
    </h1>
    <p style={{ marginBottom: "1.5rem", color: "#666" }}>
      The requested page does not exist or has been moved.
    </p>
    <a href="/" style={{ color: "#2563eb", textDecoration: "underline" }}>
      Return to Public Application
    </a>
  </main>
);

export default NotFoundPage;
