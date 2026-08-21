import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { PublicPage } from "../features/public-page/PublicPage";
import { LoginPage } from "../features/auth/LoginPage";
import { ProtectedAdminRoute } from "../features/auth/ProtectedAdminRoute";
import { AdminLayout } from "../features/admin/AdminLayout";
import { AdminDashboard } from "../features/admin/AdminDashboard";
import { SpaSectionsPage } from "../features/admin/sections/SpaSectionsPage";
import { ContentBlocksPage } from "../features/admin/content/ContentBlocksPage";
import { NotFoundPage } from "../components/common/NotFoundPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <PublicPage />,
  },
  {
    path: "/admin/login",
    element: <LoginPage />,
  },
  {
    path: "/admin",
    element: <ProtectedAdminRoute />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          {
            index: true,
            element: <AdminDashboard />,
          },
          {
            path: "sections",
            element: <SpaSectionsPage />,
          },
          {
            path: "content",
            element: <ContentBlocksPage />,
          },
          {
            path: "*",
            element: <NotFoundPage />,
          },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);

export const AppRouter: React.FC = () => {
  return <RouterProvider router={router} />;
};
