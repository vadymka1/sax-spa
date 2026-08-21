import React, { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { useAuth } from "./useAuth";
import { authSession } from "./authSession";

export const ProtectedAdminRoute: React.FC = () => {
  const { status, ensureSessionChecked } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!authSession.hasChecked() && status !== "checking") {
      ensureSessionChecked();
    }
  }, [ensureSessionChecked, status]);

  if (status === "checking" || !authSession.hasChecked()) {
    return (
      <main
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
        }}
      >
        <LoadingSpinner label="Checking session..." />
      </main>
    );
  }

  if (status === "unauthenticated") {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};
