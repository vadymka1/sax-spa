import React from "react";
import { Link } from "react-router-dom";

export const ForbiddenPage: React.FC = () => (
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
    <h1
      style={{
        fontSize: "2rem",
        marginBottom: "1rem",
        color: "var(--color-admin-text)",
        fontWeight: 700,
      }}
    >
      403 - Access Denied
    </h1>
    <p
      style={{
        marginBottom: "1.5rem",
        color: "var(--color-admin-text-muted)",
        fontSize: "1.05rem",
      }}
    >
      You do not have permission to view this page.
    </p>
    <Link
      to="/admin"
      style={{
        color: "var(--color-admin-primary)",
        textDecoration: "underline",
        fontWeight: 600,
      }}
    >
      Return to Admin Dashboard
    </Link>
  </main>
);
