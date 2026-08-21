import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UserDto } from "../api/types";
import { server } from "./msw/server";
import { authSession } from "../features/auth/authSession";
import { AuthProvider } from "../features/auth/AuthProvider";
import { LoginPage } from "../features/auth/LoginPage";
import { ProtectedAdminRoute } from "../features/auth/ProtectedAdminRoute";
import { AdminLayout } from "../features/admin/AdminLayout";
import { AdminDashboard } from "../features/admin/AdminDashboard";
import { UsersPage } from "../features/admin/users/UsersPage";
import { RequireRole } from "../features/auth/RequireRole";
import { env } from "../lib/env";

const mockSuperAdmin: UserDto = {
  id: "10000000-0000-4000-8000-000000000001",
  email: "superadmin@example.test",
  display_name: "Super Admin",
  role: "super_admin",
  is_active: true,
  last_login_at: "2026-02-01T12:00:00Z",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const mockAdminUser: UserDto = {
  id: "20000000-0000-4000-8000-000000000002",
  email: "regularadmin@example.test",
  display_name: "Regular Admin",
  role: "admin",
  is_active: true,
  last_login_at: "2026-02-02T14:30:00Z",
  created_at: "2026-01-02T00:00:00Z",
  updated_at: "2026-01-02T00:00:00Z",
};

const mockInactiveUser: UserDto = {
  id: "30000000-0000-4000-8000-000000000003",
  email: "inactive@example.test",
  display_name: "Inactive User",
  role: "admin",
  is_active: false,
  last_login_at: null,
  created_at: "2026-01-03T00:00:00Z",
  updated_at: "2026-01-03T00:00:00Z",
};

describe("FRONTEND F9 — Super Admin User Management", () => {
  beforeEach(() => {
    server.resetHandlers();
    authSession.clearSession();
  });

  afterEach(() => {
    server.resetHandlers();
    authSession.clearSession();
  });

  function renderUsersTestRouter(
    initialEntries: string[],
    user: UserDto | null = mockSuperAdmin,
  ) {
    if (user) {
      authSession.setTokens("mock-access-token", "mock-refresh-token");
      authSession.resetCheckedState();
      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/auth/me`, () => {
          return HttpResponse.json({ data: user });
        }),
      );
    } else {
      authSession.clearSession();
    }

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });

    const router = createMemoryRouter(
      [
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
                  path: "users",
                  element: (
                    <RequireRole role="super_admin">
                      <UsersPage />
                    </RequireRole>
                  ),
                },
              ],
            },
          ],
        },
      ],
      { initialEntries },
    );

    return render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </QueryClientProvider>,
    );
  }

  it("renders UsersPage when super_admin visits /admin/users", async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/users`, () => {
        return HttpResponse.json({
          data: [mockSuperAdmin, mockAdminUser],
        });
      }),
    );

    renderUsersTestRouter(["/admin/users"], mockSuperAdmin);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Users", level: 1 }),
      ).toBeInTheDocument();
      expect(screen.getByText("regularadmin@example.test")).toBeInTheDocument();
    });

    expect(screen.getAllByText("Super Admin").length).toBeGreaterThan(0);
  });

  it("renders 403 ForbiddenPage and DOES NOT call users API when normal admin visits /admin/users", async () => {
    const getUsersSpy = vi.fn();
    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/users`, () => {
        getUsersSpy();
        return HttpResponse.json({ data: [] });
      }),
    );

    renderUsersTestRouter(["/admin/users"], mockAdminUser);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "403 - Access Denied", level: 1 }),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText("You do not have permission to view this page."),
    ).toBeInTheDocument();

    // Verify 0 calls to users API for unauthorized role
    expect(getUsersSpy).not.toHaveBeenCalled();
  });

  it("shows Users link in navigation for super_admin, but hides it for normal admin", async () => {
    // 1. super_admin test
    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/users`, () => {
        return HttpResponse.json({ data: [] });
      }),
    );

    const { unmount } = renderUsersTestRouter(["/admin"], mockSuperAdmin);

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Users" })).toBeInTheDocument();
    });

    unmount();

    // 2. normal admin test
    renderUsersTestRouter(["/admin"], mockAdminUser);

    await waitFor(() => {
      expect(
        screen.getByRole("link", { name: "Dashboard" }),
      ).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("link", { name: "Users" }),
    ).not.toBeInTheDocument();
  });

  it("renders empty state when users array is empty", async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/users`, () => {
        return HttpResponse.json({ data: [] });
      }),
    );

    renderUsersTestRouter(["/admin/users"], mockSuperAdmin);

    await waitFor(() => {
      expect(screen.getByText("No users found")).toBeInTheDocument();
    });
  });

  it("handles API error gracefully and supports Retry", async () => {
    let attemptCount = 0;
    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/users`, () => {
        attemptCount++;
        if (attemptCount === 1) {
          return new HttpResponse(null, { status: 500 });
        }
        return HttpResponse.json({ data: [mockSuperAdmin] });
      }),
    );

    renderUsersTestRouter(["/admin/users"], mockSuperAdmin);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole("button", { name: "Retry" });
    await userEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText("superadmin@example.test")).toBeInTheDocument();
    });
  });

  it("handles malformed API response via Zod validation without crashing", async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/users`, () => {
        return HttpResponse.json({
          data: [{ malformed_field: true }],
        });
      }),
    );

    renderUsersTestRouter(["/admin/users"], mockSuperAdmin);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  it("creates a new user successfully via Create User modal", async () => {
    const createdUser: UserDto = {
      id: "40000000-0000-4000-8000-000000000004",
      email: "newuser@example.test",
      display_name: "New User",
      role: "admin",
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let postPayload: unknown = null;
    let usersList = [mockSuperAdmin];

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/users`, () => {
        return HttpResponse.json({ data: usersList });
      }),
      http.post(`${env.apiBaseUrl}/api/v1/admin/users`, async ({ request }) => {
        postPayload = await request.json();
        usersList = [...usersList, createdUser];
        return HttpResponse.json({ data: createdUser });
      }),
    );

    renderUsersTestRouter(["/admin/users"], mockSuperAdmin);

    await waitFor(() => {
      expect(screen.getByText("superadmin@example.test")).toBeInTheDocument();
    });

    const openCreateBtn = screen.getByRole("button", {
      name: "+ Create User",
    });
    await userEvent.click(openCreateBtn);

    expect(
      screen.getByRole("heading", { name: "Create User", level: 2 }),
    ).toBeInTheDocument();

    const emailInput = screen.getByLabelText("Email Address");
    const nameInput = screen.getByLabelText("Display Name");
    const passwordInput = screen.getByLabelText("Password");

    expect(passwordInput).toHaveAttribute("autocomplete", "new-password");

    await userEvent.type(emailInput, "newuser@example.test");
    await userEvent.type(nameInput, "New User");
    await userEvent.type(passwordInput, "secretpassword123");

    const submitBtn = screen.getByRole("button", { name: "Create User" });
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "Create User", level: 2 }),
      ).not.toBeInTheDocument();
    });

    expect(postPayload).toEqual({
      email: "newuser@example.test",
      display_name: "New User",
      role: "admin",
      password: "secretpassword123",
      is_active: true,
    });

    await waitFor(() => {
      expect(screen.getByText("newuser@example.test")).toBeInTheDocument();
    });
  });

  it("edits an existing user successfully", async () => {
    let patchPayload: unknown = null;
    let usersList = [mockSuperAdmin, mockAdminUser];

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/users`, () => {
        return HttpResponse.json({ data: usersList });
      }),
      http.patch(
        `${env.apiBaseUrl}/api/v1/admin/users/:id`,
        async ({ request, params }) => {
          patchPayload = await request.json();
          const updated: UserDto = {
            ...mockAdminUser,
            display_name: "Updated Regular Admin",
          };
          usersList = usersList.map((u) => (u.id === params.id ? updated : u));
          return HttpResponse.json({ data: updated });
        },
      ),
    );

    renderUsersTestRouter(["/admin/users"], mockSuperAdmin);

    await waitFor(() => {
      expect(screen.getByText("regularadmin@example.test")).toBeInTheDocument();
    });

    const editBtn = screen.getByRole("button", {
      name: "Edit Regular Admin",
    });
    await userEvent.click(editBtn);

    const nameInput = screen.getByLabelText("Display Name");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Updated Regular Admin");

    const saveBtn = screen.getByRole("button", { name: "Save Changes" });
    await userEvent.click(saveBtn);

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "Edit User", level: 2 }),
      ).not.toBeInTheDocument();
    });

    expect(patchPayload).toEqual({
      display_name: "Updated Regular Admin",
      role: "admin",
      is_active: true,
    });

    await waitFor(() => {
      expect(screen.getByText("Updated Regular Admin")).toBeInTheDocument();
    });
  });

  it("deactivates and activates a user via status modal", async () => {
    let patchPayload: unknown = null;
    let usersList = [mockSuperAdmin, mockInactiveUser];

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/users`, () => {
        return HttpResponse.json({ data: usersList });
      }),
      http.patch(
        `${env.apiBaseUrl}/api/v1/admin/users/:id`,
        async ({ request, params }) => {
          patchPayload = await request.json();
          const updated: UserDto = {
            ...mockInactiveUser,
            is_active: true,
          };
          usersList = usersList.map((u) => (u.id === params.id ? updated : u));
          return HttpResponse.json({ data: updated });
        },
      ),
    );

    renderUsersTestRouter(["/admin/users"], mockSuperAdmin);

    await waitFor(() => {
      expect(screen.getByText("inactive@example.test")).toBeInTheDocument();
    });

    const activateBtn = screen.getByRole("button", {
      name: "Activate Inactive User",
    });
    await userEvent.click(activateBtn);

    expect(
      screen.getByRole("heading", { name: "Activate User", level: 2 }),
    ).toBeInTheDocument();

    const confirmBtn = screen.getByRole("button", { name: "Activate" });
    await userEvent.click(confirmBtn);

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "Activate User", level: 2 }),
      ).not.toBeInTheDocument();
    });

    expect(patchPayload).toEqual({
      is_active: true,
    });
  });

  it("prevents self-deactivation with a safety notice for the logged-in super_admin", async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/users`, () => {
        return HttpResponse.json({ data: [mockSuperAdmin] });
      }),
    );

    renderUsersTestRouter(["/admin/users"], mockSuperAdmin);

    await waitFor(() => {
      expect(screen.getByText("superadmin@example.test")).toBeInTheDocument();
    });

    const deactivateBtn = screen.getByRole("button", {
      name: "Deactivate Super Admin",
    });
    await userEvent.click(deactivateBtn);

    await waitFor(() => {
      expect(
        screen.getByText("You cannot deactivate your own active session."),
      ).toBeInTheDocument();
    });

    const confirmBtn = screen.getByRole("button", { name: "Deactivate" });
    expect(confirmBtn).toBeDisabled();
  });

  it("CASE A — allows valid own-account edits (display_name) while keeping is_active: true in PATCH payload", async () => {
    let patchPayload: Record<string, unknown> | null = null;
    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/users`, () => {
        return HttpResponse.json({ data: [mockSuperAdmin] });
      }),
      http.patch(
        `${env.apiBaseUrl}/api/v1/admin/users/:id`,
        async ({ request }) => {
          patchPayload = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json({
            data: { ...mockSuperAdmin, display_name: "Updated Super Admin" },
          });
        },
      ),
    );

    renderUsersTestRouter(["/admin/users"], mockSuperAdmin);

    await waitFor(() => {
      expect(screen.getByText("superadmin@example.test")).toBeInTheDocument();
    });

    const editBtn = screen.getByRole("button", {
      name: "Edit Super Admin",
    });
    await userEvent.click(editBtn);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Edit User", level: 2 }),
      ).toBeInTheDocument();
    });

    // 1. Verify warning notice
    expect(
      screen.getByText("You cannot deactivate your own active session."),
    ).toBeInTheDocument();

    // 2. Verify Active checkbox is checked and disabled
    const activeCheckbox = screen.getByLabelText(
      "Account Active",
    ) as HTMLInputElement;
    expect(activeCheckbox).toBeDisabled();
    expect(activeCheckbox.checked).toBe(true);

    // 3. Edit display name
    const nameInput = screen.getByLabelText("Display Name");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Updated Super Admin");

    // 4. Save changes
    const saveBtn = screen.getByRole("button", { name: "Save Changes" });
    await userEvent.click(saveBtn);

    // 5. Verify PATCH payload sent contains display_name and is_active: true
    await waitFor(() => {
      expect(patchPayload).toEqual({
        display_name: "Updated Super Admin",
        role: "super_admin",
        is_active: true,
      });
    });
  });

  it("locks the Active control when editing the current user account (checkbox checked & disabled with explanation notice)", async () => {
    const patchSpy = vi.fn();
    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/users`, () => {
        return HttpResponse.json({ data: [mockSuperAdmin] });
      }),
      http.patch(`${env.apiBaseUrl}/api/v1/admin/users/:id`, () => {
        patchSpy();
        return HttpResponse.json({ data: mockSuperAdmin });
      }),
    );

    renderUsersTestRouter(["/admin/users"], mockSuperAdmin);

    await waitFor(() => {
      expect(screen.getByText("superadmin@example.test")).toBeInTheDocument();
    });

    const editBtn = screen.getByRole("button", {
      name: "Edit Super Admin",
    });
    await userEvent.click(editBtn);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Edit User", level: 2 }),
      ).toBeInTheDocument();
    });

    // 1. Explanation notice is visible
    expect(
      screen.getByText("You cannot deactivate your own active session."),
    ).toBeInTheDocument();

    // 2. Active checkbox is checked and disabled
    const activeCheckbox = screen.getByLabelText(
      "Account Active",
    ) as HTMLInputElement;
    expect(activeCheckbox).toBeDisabled();
    expect(activeCheckbox.checked).toBe(true);

    // 0 PATCH calls attempted with is_active: false
    expect(patchSpy).toHaveBeenCalledTimes(0);
  });

  it("form-level runtime role parsing prevents invalid select values (e.g. 'root') from entering role state or POST payloads", async () => {
    let postPayload: Record<string, unknown> | null = null;
    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/users`, () => {
        return HttpResponse.json({ data: [mockSuperAdmin] });
      }),
      http.post(`${env.apiBaseUrl}/api/v1/admin/users`, async ({ request }) => {
        postPayload = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ data: mockSuperAdmin });
      }),
    );

    renderUsersTestRouter(["/admin/users"], mockSuperAdmin);

    await waitFor(() => {
      expect(screen.getByText("superadmin@example.test")).toBeInTheDocument();
    });

    const openCreateBtn = screen.getByRole("button", {
      name: "+ Create User",
    });
    await userEvent.click(openCreateBtn);

    const roleSelect = screen.getByLabelText("Role") as HTMLSelectElement;

    // Trigger change with an invalid value 'root'
    fireEvent.change(roleSelect, { target: { value: "root" } });

    // Role select should still be 'admin' (invalid value 'root' rejected by AdminRoleSchema.safeParse)
    expect(roleSelect.value).toBe("admin");

    await userEvent.type(
      screen.getByLabelText("Email Address"),
      "testrole@example.test",
    );
    await userEvent.type(
      screen.getByLabelText("Display Name"),
      "Test Role User",
    );
    await userEvent.type(screen.getByLabelText("Password"), "secret123");

    await userEvent.click(screen.getByRole("button", { name: "Create User" }));

    // Assert that the captured POST payload role is 'admin' and NOT 'root'
    await waitFor(() => {
      expect(postPayload).not.toBeNull();
      expect(postPayload?.role).toBe("admin");
      expect(postPayload?.role).not.toBe("root");
    });
  });

  it("enforces password minimum length of 6 characters (5 characters fails validation with 0 POST calls, 6 characters succeeds)", async () => {
    const postSpy = vi.fn();
    const createdUser: UserDto = {
      id: "40000000-0000-4000-8000-000000000004",
      email: "shortpass@example.test",
      display_name: "Short Pass User",
      role: "admin",
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/users`, () => {
        return HttpResponse.json({ data: [mockSuperAdmin] });
      }),
      http.post(`${env.apiBaseUrl}/api/v1/admin/users`, () => {
        postSpy();
        return HttpResponse.json({ data: createdUser });
      }),
    );

    renderUsersTestRouter(["/admin/users"], mockSuperAdmin);

    await waitFor(() => {
      expect(screen.getByText("superadmin@example.test")).toBeInTheDocument();
    });

    const openCreateBtn = screen.getByRole("button", {
      name: "+ Create User",
    });
    await userEvent.click(openCreateBtn);

    const emailInput = screen.getByLabelText("Email Address");
    const nameInput = screen.getByLabelText("Display Name");
    const passwordInput = screen.getByLabelText("Password");

    await userEvent.type(emailInput, "shortpass@example.test");
    await userEvent.type(nameInput, "Short Pass User");

    // 1. Try 5-character password
    await userEvent.type(passwordInput, "12345");
    const submitBtn = screen.getByRole("button", { name: "Create User" });
    await userEvent.click(submitBtn);

    // POST must NOT be called for 5-character password due to HTML5 minLength=6 constraint
    expect(postSpy).not.toHaveBeenCalled();

    // 2. Type 6th character to make it 6 characters
    await userEvent.type(passwordInput, "6");
    await userEvent.click(submitBtn);

    // POST must be called now that length is 6
    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledTimes(1);
    });
  });

  it("prevents backdrop click and Escape key from closing modal while mutation is pending", async () => {
    let resolvePost: (value?: unknown) => void = () => {};
    const pendingPromise = new Promise((resolve) => {
      resolvePost = resolve;
    });

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/users`, () => {
        return HttpResponse.json({ data: [mockSuperAdmin] });
      }),
      http.post(`${env.apiBaseUrl}/api/v1/admin/users`, async () => {
        await pendingPromise;
        return HttpResponse.json({ data: mockSuperAdmin });
      }),
    );

    renderUsersTestRouter(["/admin/users"], mockSuperAdmin);

    await waitFor(() => {
      expect(screen.getByText("superadmin@example.test")).toBeInTheDocument();
    });

    const openCreateBtn = screen.getByRole("button", {
      name: "+ Create User",
    });
    await userEvent.click(openCreateBtn);

    await userEvent.type(
      screen.getByLabelText("Email Address"),
      "pending@example.test",
    );
    await userEvent.type(screen.getByLabelText("Display Name"), "Pending User");
    await userEvent.type(screen.getByLabelText("Password"), "secret123");

    const submitBtn = screen.getByRole("button", { name: "Create User" });
    await userEvent.click(submitBtn);

    // Modal is now submitting
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Creating..." }),
      ).toBeInTheDocument();
    });

    // 1. Try backdrop click while pending
    const modalDialog = screen.getByRole("dialog");
    const modalBackdrop = modalDialog.parentElement!;
    await userEvent.click(modalBackdrop);

    // Modal MUST remain open
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // 2. Try Escape key while pending
    fireEvent.keyDown(document, { key: "Escape" });

    // Modal MUST remain open
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Clean up: resolve pending mutation
    resolvePost?.({ data: mockSuperAdmin });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("restores focus to trigger button when Create User or Edit User modal is closed", async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/users`, () => {
        return HttpResponse.json({ data: [mockSuperAdmin] });
      }),
    );

    renderUsersTestRouter(["/admin/users"], mockSuperAdmin);

    await waitFor(() => {
      expect(screen.getByText("superadmin@example.test")).toBeInTheDocument();
    });

    // 1. Create User modal focus restoration
    const openCreateBtn = screen.getByRole("button", {
      name: "+ Create User",
    });
    openCreateBtn.focus();
    await userEvent.click(openCreateBtn);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Create User", level: 2 }),
      ).toBeInTheDocument();
    });

    const createCancelBtn = screen.getByRole("button", { name: "Cancel" });
    await userEvent.click(createCancelBtn);

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "Create User", level: 2 }),
      ).not.toBeInTheDocument();
      expect(document.activeElement).toBe(openCreateBtn);
    });

    // 2. Edit User modal focus restoration
    const editBtn = screen.getByRole("button", { name: "Edit Super Admin" });
    editBtn.focus();
    await userEvent.click(editBtn);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Edit User", level: 2 }),
      ).toBeInTheDocument();
    });

    const editCancelBtn = screen.getByRole("button", { name: "Cancel" });
    await userEvent.click(editCancelBtn);

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "Edit User", level: 2 }),
      ).not.toBeInTheDocument();
      expect(document.activeElement).toBe(editBtn);
    });
  });

  it("renders and preserves request_id on mutation error", async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/users`, () => {
        return HttpResponse.json({ data: [mockSuperAdmin] });
      }),
      http.post(`${env.apiBaseUrl}/api/v1/admin/users`, () => {
        return HttpResponse.json(
          {
            error: {
              code: "USER_EXISTS",
              message: "A user with this email address already exists.",
              request_id: "req_user_err_999",
            },
          },
          { status: 400 },
        );
      }),
    );

    renderUsersTestRouter(["/admin/users"], mockSuperAdmin);

    await waitFor(() => {
      expect(screen.getByText("superadmin@example.test")).toBeInTheDocument();
    });

    const openCreateBtn = screen.getByRole("button", {
      name: "+ Create User",
    });
    await userEvent.click(openCreateBtn);

    await userEvent.type(
      screen.getByLabelText("Email Address"),
      "superadmin@example.test",
    );
    await userEvent.type(
      screen.getByLabelText("Display Name"),
      "Duplicate User",
    );
    await userEvent.type(screen.getByLabelText("Password"), "secret123");

    await userEvent.click(screen.getByRole("button", { name: "Create User" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(
        screen.getByText("Request ID: req_user_err_999"),
      ).toBeInTheDocument();
    });
  });
});
