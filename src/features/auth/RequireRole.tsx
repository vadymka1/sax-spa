import React from "react";
import { AdminRole } from "../../api/types";
import { ForbiddenPage } from "../../components/common/ForbiddenPage";
import { useAuth } from "./useAuth";

interface RequireRoleProps {
  role: AdminRole;
  children: React.ReactElement;
}

export const RequireRole: React.FC<RequireRoleProps> = ({ role, children }) => {
  const { user } = useAuth();

  if (!user || user.role !== role) {
    return <ForbiddenPage />;
  }

  return children;
};
