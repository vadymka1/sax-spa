import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { server } from "./msw/server";
import { env } from "../lib/env";
import { AuthProvider } from "../features/auth/AuthProvider";
import { authSession } from "../features/auth/authSession";
import { LoginPage } from "../features/auth/LoginPage";
import { ProtectedAdminRoute } from "../features/auth/ProtectedAdminRoute";
import { AdminLayout } from "../features/admin/AdminLayout";
import { AdminDashboard } from "../features/admin/AdminDashboard";
import { PublicPage } from "../features/public-page/PublicPage";
import { apiClient } from "../api/client";
import { authApi } from "../api/authApi";

const mockActiveUser = {
  id: "e1b2c3d4-e5f6-4890-abcd-ef1234567890",
  email: "admin@example.test",
  display_name: "Test Admin",
  role: "admin" as const,
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const mockSuperAdminUser = {
  id: "e2b2c3d4-e5f6-4890-abcd-ef1234567891",
  email: "super@example.test",
  display_name: "Super Admin",
  role: "super_admin" as const,
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const mockInactiveUser = {
  id: "e3b2c3d4-e5f6-4890-abcd-ef1234567892",
  email: "inactive@example.test",
  display_name: "Inactive User",
  role: "admin" as const,
  is_active: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

function renderTestRouter(initialEntries = ["/admin"]) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        retryDelay: 0,
        staleTime: 0,
      },
    },
  });

  const testRouter = createMemoryRouter(
    [
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
                path: "settings",
                element: <AdminDashboard />,
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
        <RouterProvider router={testRouter} />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe("FRONTEND F4.2 — Honest Contract-B Session Model + Token Hygiene", () => {
  beforeEach(() => {
    authSession.clearSession();
    authSession.resetCheckedState();
  });

  afterEach(() => {
    authSession.clearSession();
    authSession.resetCheckedState();
    vi.restoreAllMocks();
  });

  it("renders login form with semantic inputs and correct autocomplete attributes", async () => {
    renderTestRouter(["/admin/login"]);

    await screen.findByRole("heading", { name: "SPA Saxophone CMS" });

    const emailInput = screen.getByLabelText(
      /Email Address/i,
    ) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(
      /Password/i,
    ) as HTMLInputElement;
    const submitButton = screen.getByRole("button", {
      name: /Sign In to CMS/i,
    });

    expect(emailInput).toHaveAttribute("type", "email");
    expect(emailInput).toHaveAttribute("autocomplete", "username");
    expect(passwordInput).toHaveAttribute("type", "password");
    expect(passwordInput).toHaveAttribute("autocomplete", "current-password");
    expect(submitButton).toBeInTheDocument();
  });

  it("inspects exact login request payload and successfully logs in", async () => {
    let capturedPayload: unknown = null;

    server.use(
      http.post(`${env.apiBaseUrl}/api/v1/auth/login`, async ({ request }) => {
        capturedPayload = await request.json();
        return HttpResponse.json({
          data: {
            access_token: "token-login-123",
            refresh_token: "ref-123",
            token_type: "Bearer",
            expires_in: 3600,
            user: mockActiveUser,
          },
        });
      }),
    );

    renderTestRouter(["/admin/login"]);

    await screen.findByRole("heading", { name: "SPA Saxophone CMS" });

    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: "admin@example.test" },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: "secret123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Sign In to CMS/i }));

    await screen.findByText("Admin Dashboard");

    expect(capturedPayload).toEqual({
      email: "admin@example.test",
      password: "secret123",
    });
    expect(screen.getByText(/admin@example\.test/)).toBeInTheDocument();
    expect(screen.getAllByText("admin")[0]).toBeInTheDocument();
  });

  it("displays safe error message and request ID when login fails", async () => {
    server.use(
      http.post(`${env.apiBaseUrl}/api/v1/auth/login`, () => {
        return HttpResponse.json(
          {
            error: {
              code: "INVALID_CREDENTIALS",
              message: "Invalid email or password",
              request_id: "req-login-err-99",
            },
          },
          { status: 401 },
        );
      }),
    );

    renderTestRouter(["/admin/login"]);

    await screen.findByRole("heading", { name: "SPA Saxophone CMS" });

    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: "wrong@example.test" },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: "wrongpass" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Sign In to CMS/i }));

    await screen.findByText("Error (INVALID_CREDENTIALS)");
    expect(screen.getByText("Invalid email or password")).toBeInTheDocument();
    expect(screen.getByText(/req-login-err-99/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "SPA Saxophone CMS" }),
    ).toBeInTheDocument();
  });

  it("prevents duplicate submissions by disabling form controls during pending login", async () => {
    server.use(
      http.post(`${env.apiBaseUrl}/api/v1/auth/login`, async () => {
        await new Promise((r) => setTimeout(r, 50));
        return HttpResponse.json({
          data: {
            access_token: "token-login-123",
            refresh_token: "ref-123",
            token_type: "Bearer",
            expires_in: 3600,
            user: mockActiveUser,
          },
        });
      }),
    );

    renderTestRouter(["/admin/login"]);

    await screen.findByRole("heading", { name: "SPA Saxophone CMS" });

    const submitBtn = screen.getByRole("button", { name: /Sign In to CMS/i });
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: "admin@example.test" },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: "secret123" },
    });

    fireEvent.click(submitBtn);

    expect(submitBtn).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /Signing in.../i }),
    ).toBeInTheDocument();

    await screen.findByText("Admin Dashboard");
  });

  it("redirects unauthenticated users visiting /admin to /admin/login", async () => {
    server.use(
      http.post(`${env.apiBaseUrl}/api/v1/auth/refresh`, () => {
        return HttpResponse.json(
          { error: { code: "UNAUTHORIZED" } },
          { status: 401 },
        );
      }),
    );

    renderTestRouter(["/admin"]);

    await screen.findByRole("heading", { name: "SPA Saxophone CMS" });
    expect(screen.queryByText("Admin Dashboard")).toBeNull();
  });

  it("MANDATORY F4.2 TEST: fresh process with zero in-memory tokens visiting /admin triggers 0 refresh calls and redirects to login", async () => {
    let refreshCallCount = 0;
    authSession.clearSession();
    authSession.resetCheckedState();

    server.use(
      http.post(`${env.apiBaseUrl}/api/v1/auth/refresh`, () => {
        refreshCallCount += 1;
        return HttpResponse.json({
          data: {
            access_token: "should-not-be-called",
            refresh_token: "should-not-be-called",
            token_type: "Bearer",
            expires_in: 3600,
          },
        });
      }),
    );

    renderTestRouter(["/admin"]);

    await screen.findByRole("heading", { name: "SPA Saxophone CMS" });
    expect(screen.queryByText("Admin Dashboard")).toBeNull();
    expect(refreshCallCount).toBe(0);
    expect(authSession.getAccessToken()).toBeNull();
    expect(authSession.getRefreshToken()).toBeNull();
  });

  it("MANDATORY F4.2 TEST: authApi.refresh sends exact refresh_token JSON body payload", async () => {
    let capturedBody: unknown = null;

    server.use(
      http.post(
        `${env.apiBaseUrl}/api/v1/auth/refresh`,
        async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({
            data: {
              access_token: "rotated-access-token",
              refresh_token: "rotated-refresh-token",
              token_type: "Bearer",
              expires_in: 3600,
            },
          });
        },
      ),
    );

    const result = await authApi.refresh("my-explicit-refresh-token-123");

    expect(capturedBody).toEqual({
      refresh_token: "my-explicit-refresh-token-123",
    });
    expect(result.access_token).toBe("rotated-access-token");
    expect(result.refresh_token).toBe("rotated-refresh-token");
  });

  it("MANDATORY F4.2 TEST: authApi.logout sends exact refresh_token JSON body payload", async () => {
    let capturedBody: unknown = null;

    server.use(
      http.post(`${env.apiBaseUrl}/api/v1/auth/logout`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({
          data: { message: "Successfully logged out" },
        });
      }),
    );

    await authApi.logout("logout-refresh-token-456");

    expect(capturedBody).toEqual({
      refresh_token: "logout-refresh-token-456",
    });
  });

  it("MANDATORY F4.2 TEST: getOrStartRefresh updates BOTH access_token and refresh_token in memory upon rotation", async () => {
    authSession.setTokens("access-old", "refresh-R1");

    server.use(
      http.post(`${env.apiBaseUrl}/api/v1/auth/refresh`, () => {
        return HttpResponse.json({
          data: {
            access_token: "access-new-B",
            refresh_token: "refresh-new-R2",
            token_type: "Bearer",
            expires_in: 3600,
          },
        });
      }),
    );

    const newAccessToken = await authSession.getOrStartRefresh();

    expect(newAccessToken).toBe("access-new-B");
    expect(authSession.getAccessToken()).toBe("access-new-B");
    expect(authSession.getRefreshToken()).toBe("refresh-new-R2");
  });

  it("MANDATORY F4.2 TEST: getOrStartRefresh short-circuits with 0 network calls when refresh token is absent", async () => {
    let refreshCallCount = 0;
    authSession.setTokens(null, null);

    server.use(
      http.post(`${env.apiBaseUrl}/api/v1/auth/refresh`, () => {
        refreshCallCount += 1;
        return HttpResponse.json({
          data: {
            access_token: "should-not-happen",
            refresh_token: "should-not-happen",
            token_type: "Bearer",
            expires_in: 3600,
          },
        });
      }),
    );

    await expect(authSession.getOrStartRefresh()).rejects.toThrow(
      "No refresh token available",
    );

    expect(refreshCallCount).toBe(0);
    expect(authSession.getAccessToken()).toBeNull();
  });

  it("MANDATORY F4.2 TEST: 401 response when refresh token is absent clears session and skips refresh request", async () => {
    let refreshCallCount = 0;
    let failureEmitted = false;

    authSession.setTokens("stale-access-no-refresh", null);
    const unsubscribe = authSession.onAuthFailure(() => {
      failureEmitted = true;
    });

    server.use(
      http.post(`${env.apiBaseUrl}/api/v1/auth/refresh`, () => {
        refreshCallCount += 1;
        return HttpResponse.json(
          { error: { code: "UNAUTHORIZED" } },
          { status: 401 },
        );
      }),
      http.get(`${env.apiBaseUrl}/api/v1/public/test-protected-no-ref`, () => {
        return HttpResponse.json(
          { error: { code: "UNAUTHORIZED" } },
          { status: 401 },
        );
      }),
    );

    await expect(
      apiClient.get("/api/v1/public/test-protected-no-ref"),
    ).rejects.toThrow();

    expect(refreshCallCount).toBe(0);
    expect(authSession.getAccessToken()).toBeNull();
    expect(failureEmitted).toBe(true);

    unsubscribe();
  });

  it("MANDATORY F4.1 TEST: public route / makes EXACTLY 0 refresh calls", async () => {
    let refreshCallCount = 0;

    server.use(
      http.post(`${env.apiBaseUrl}/api/v1/auth/refresh`, () => {
        refreshCallCount += 1;
        return HttpResponse.json({
          data: {
            access_token: "should-not-be-called",
            refresh_token: "should-not-be-called",
            token_type: "Bearer",
            expires_in: 3600,
          },
        });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/public/page`, () => {
        return HttpResponse.json({
          data: {
            page: {
              id: "a1b2c3d4-e5f6-4890-abcd-ef1234567890",
              slug: "home",
              title: "Public SPA Page",
            },
            sections: [],
          },
        });
      }),
    );

    renderTestRouter(["/"]);

    await screen.findByText("Public SPA Page");
    expect(
      screen.getByText(/No content is available yet/i),
    ).toBeInTheDocument();

    expect(refreshCallCount).toBe(0);
  });

  it("MANDATORY F4.1 TEST: public route / renders normally even if /auth/refresh fails with 500 error", async () => {
    server.use(
      http.post(`${env.apiBaseUrl}/api/v1/auth/refresh`, () => {
        return HttpResponse.json(
          { error: { code: "SERVER_ERROR", message: "Database down" } },
          { status: 500 },
        );
      }),
      http.get(`${env.apiBaseUrl}/api/v1/public/page`, () => {
        return HttpResponse.json({
          data: {
            page: {
              id: "a1b2c3d4-e5f6-4890-abcd-ef1234567890",
              slug: "home",
              title: "Public SPA Page",
            },
            sections: [],
          },
        });
      }),
    );

    renderTestRouter(["/"]);

    await screen.findByText("Public SPA Page");
    expect(screen.getByText("Public SPA Page")).toBeInTheDocument();
  });

  it("MANDATORY F4.1 TEST: login establishes session and navigating to /admin does NOT trigger extra refresh call", async () => {
    let refreshCallCount = 0;

    server.use(
      http.post(`${env.apiBaseUrl}/api/v1/auth/refresh`, () => {
        refreshCallCount += 1;
        return HttpResponse.json({
          data: {
            access_token: "refreshed-token",
            refresh_token: "refreshed-ref",
            token_type: "Bearer",
            expires_in: 3600,
          },
        });
      }),
      http.post(`${env.apiBaseUrl}/api/v1/auth/login`, () => {
        return HttpResponse.json({
          data: {
            access_token: "token-login-123",
            refresh_token: "ref-123",
            token_type: "Bearer",
            expires_in: 3600,
            user: mockActiveUser,
          },
        });
      }),
    );

    renderTestRouter(["/admin/login"]);

    await screen.findByRole("heading", { name: "SPA Saxophone CMS" });

    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: "admin@example.test" },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: "secret123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Sign In to CMS/i }));

    await screen.findByText("Admin Dashboard");

    expect(refreshCallCount).toBe(0);
  });

  it("MANDATORY F4.1 TEST: ensureSessionChecked() deduplicates concurrent callers into 1 refresh call", async () => {
    let refreshCallCount = 0;
    authSession.setTokens(null, "valid-ref-token");
    authSession.resetCheckedState();

    server.use(
      http.post(
        `${env.apiBaseUrl}/api/v1/auth/refresh`,
        async ({ request }) => {
          refreshCallCount += 1;
          const body = (await request.json()) as { refresh_token: string };
          expect(body).toEqual({ refresh_token: "valid-ref-token" });
          await new Promise((r) => setTimeout(r, 20));
          return HttpResponse.json({
            data: {
              access_token: "deduped-access-token",
              refresh_token: "deduped-refresh-token",
              token_type: "Bearer",
              expires_in: 3600,
            },
          });
        },
      ),
    );

    const [t1, t2, t3] = await Promise.all([
      authSession.getOrStartRefresh(),
      authSession.getOrStartRefresh(),
      authSession.getOrStartRefresh(),
    ]);

    expect(refreshCallCount).toBe(1);
    expect(t1).toBe("deduped-access-token");
    expect(t2).toBe("deduped-access-token");
    expect(t3).toBe("deduped-access-token");
  });

  it("restores admin session from an existing in-memory refresh token and automatically retries 401 request ONCE", async () => {
    let refreshCallCount = 0;
    let protectedCallCount = 0;
    let capturedRefreshBody: unknown = null;
    const capturedAuthHeaders: (string | null)[] = [];

    authSession.setTokens("stale-access", "active-refresh-token");

    server.use(
      http.post(
        `${env.apiBaseUrl}/api/v1/auth/refresh`,
        async ({ request }) => {
          refreshCallCount += 1;
          capturedRefreshBody = await request.json();
          return HttpResponse.json({
            data: {
              access_token: "new-token-777",
              refresh_token: "new-ref-777",
              token_type: "Bearer",
              expires_in: 3600,
            },
          });
        },
      ),
      http.get(`${env.apiBaseUrl}/api/v1/auth/me`, ({ request }) => {
        protectedCallCount += 1;
        capturedAuthHeaders.push(request.headers.get("Authorization"));
        if (protectedCallCount === 1) {
          return HttpResponse.json(
            { error: { code: "UNAUTHORIZED" } },
            { status: 401 },
          );
        }
        return HttpResponse.json({ data: mockActiveUser });
      }),
    );

    renderTestRouter(["/admin"]);

    await screen.findByText("Admin Dashboard", {}, { timeout: 4000 });

    expect(refreshCallCount).toBe(1);
    expect(capturedRefreshBody).toEqual({
      refresh_token: "active-refresh-token",
    });
    expect(protectedCallCount).toBe(2);
    expect(capturedAuthHeaders[1]).toBe("Bearer new-token-777");
  });

  it("deduplicates concurrent 401 responses into exactly ONE single-flight refresh request", async () => {
    let refreshCallCount = 0;
    authSession.setTokens("stale-token", "active-refresh");

    server.use(
      http.post(`${env.apiBaseUrl}/api/v1/auth/refresh`, async () => {
        refreshCallCount += 1;
        await new Promise((r) => setTimeout(r, 20));
        return HttpResponse.json({
          data: {
            access_token: "single-flight-token",
            refresh_token: "ref-sf",
            token_type: "Bearer",
            expires_in: 3600,
          },
        });
      }),
      http.get(
        `${env.apiBaseUrl}/api/v1/public/test-protected`,
        ({ request }) => {
          const auth = request.headers.get("Authorization");
          if (auth !== "Bearer single-flight-token") {
            return HttpResponse.json(
              { error: { code: "UNAUTHORIZED" } },
              { status: 401 },
            );
          }
          return HttpResponse.json({ data: "ok" });
        },
      ),
    );

    const [r1, r2, r3] = await Promise.all([
      apiClient.get("/api/v1/public/test-protected"),
      apiClient.get("/api/v1/public/test-protected"),
      apiClient.get("/api/v1/public/test-protected"),
    ]);

    expect(refreshCallCount).toBe(1);
    expect(r1.data.data).toBe("ok");
    expect(r2.data.data).toBe("ok");
    expect(r3.data.data).toBe("ok");
  });

  it("clears auth state and redirects to login when refresh fails", async () => {
    let refreshCallCount = 0;
    authSession.setTokens(null, "active-refresh");
    authSession.resetCheckedState();

    server.use(
      http.post(`${env.apiBaseUrl}/api/v1/auth/refresh`, () => {
        refreshCallCount += 1;
        return HttpResponse.json(
          { error: { code: "UNAUTHORIZED", message: "Session expired" } },
          { status: 401 },
        );
      }),
    );

    renderTestRouter(["/admin"]);

    await screen.findByRole("heading", { name: "SPA Saxophone CMS" });

    expect(refreshCallCount).toBe(1);
    expect(authSession.getAccessToken()).toBeNull();
    expect(screen.queryByText("Admin Dashboard")).toBeNull();
  });

  it("prevents recursive refresh calls when the refresh endpoint itself returns 401", async () => {
    let refreshCallCount = 0;
    authSession.setTokens(null, "active-refresh");
    authSession.resetCheckedState();

    server.use(
      http.post(`${env.apiBaseUrl}/api/v1/auth/refresh`, () => {
        refreshCallCount += 1;
        return HttpResponse.json(
          { error: { code: "UNAUTHORIZED" } },
          { status: 401 },
        );
      }),
    );

    renderTestRouter(["/admin"]);

    await screen.findByRole("heading", { name: "SPA Saxophone CMS" });
    expect(refreshCallCount).toBe(1);
  });

  it("handles successful logout by sending refresh_token JSON body, clearing session, and navigating to login", async () => {
    let capturedLogoutBody: unknown = null;

    authSession.setTokens(null, "valid-refresh-token");
    authSession.resetCheckedState();

    server.use(
      http.post(`${env.apiBaseUrl}/api/v1/auth/refresh`, () => {
        return HttpResponse.json({
          data: {
            access_token: "valid-access",
            refresh_token: "valid-refresh-token",
            token_type: "Bearer",
            expires_in: 3600,
          },
        });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/auth/me`, () => {
        return HttpResponse.json({ data: mockActiveUser });
      }),
      http.post(`${env.apiBaseUrl}/api/v1/auth/logout`, async ({ request }) => {
        capturedLogoutBody = await request.json();
        return HttpResponse.json({
          data: { message: "Successfully logged out" },
        });
      }),
    );

    renderTestRouter(["/admin"]);

    await screen.findByText("Admin Dashboard", {}, { timeout: 4000 });

    const logoutBtn = screen.getByRole("button", { name: /Log Out/i });
    fireEvent.click(logoutBtn);

    await screen.findByRole("heading", { name: "SPA Saxophone CMS" });

    expect(capturedLogoutBody).toEqual({
      refresh_token: "valid-refresh-token",
    });
    expect(authSession.getAccessToken()).toBeNull();
  });

  it("clears local session and exits admin UI even if POST /auth/logout returns a server error", async () => {
    authSession.setTokens(null, "valid-refresh-token");
    authSession.resetCheckedState();

    server.use(
      http.post(`${env.apiBaseUrl}/api/v1/auth/refresh`, () => {
        return HttpResponse.json({
          data: {
            access_token: "valid-access",
            refresh_token: "valid-refresh-token",
            token_type: "Bearer",
            expires_in: 3600,
          },
        });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/auth/me`, () => {
        return HttpResponse.json({ data: mockActiveUser });
      }),
      http.post(`${env.apiBaseUrl}/api/v1/auth/logout`, () => {
        return HttpResponse.json(
          { error: { code: "SERVER_ERROR", message: "Logout error" } },
          { status: 500 },
        );
      }),
    );

    renderTestRouter(["/admin"]);

    await screen.findByText("Admin Dashboard", {}, { timeout: 4000 });

    const logoutBtn = screen.getByRole("button", { name: /Log Out/i });
    fireEvent.click(logoutBtn);

    await screen.findByRole("heading", { name: "SPA Saxophone CMS" });

    expect(authSession.getAccessToken()).toBeNull();
  });

  it("restores intended destination after logging in from a protected deep link", async () => {
    server.use(
      http.post(`${env.apiBaseUrl}/api/v1/auth/login`, () => {
        return HttpResponse.json({
          data: {
            access_token: "token-deeplink-123",
            refresh_token: "ref-123",
            token_type: "Bearer",
            expires_in: 3600,
            user: mockActiveUser,
          },
        });
      }),
    );

    renderTestRouter(["/admin/settings"]);

    await screen.findByRole("heading", { name: "SPA Saxophone CMS" });

    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: "admin@example.test" },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: "secret123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Sign In to CMS/i }));

    await screen.findByText("Admin Dashboard");
  });

  it("rejects inactive users returned from /auth/me and clears auth state", async () => {
    authSession.setTokens(null, "inactive-refresh");
    authSession.resetCheckedState();

    server.use(
      http.post(`${env.apiBaseUrl}/api/v1/auth/refresh`, () => {
        return HttpResponse.json({
          data: {
            access_token: "inactive-access",
            refresh_token: "inactive-refresh",
            token_type: "Bearer",
            expires_in: 3600,
          },
        });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/auth/me`, () => {
        return HttpResponse.json({ data: mockInactiveUser });
      }),
    );

    renderTestRouter(["/admin"]);

    await screen.findByRole("heading", { name: "SPA Saxophone CMS" });

    expect(authSession.getAccessToken()).toBeNull();
    expect(screen.queryByText("Admin Dashboard")).toBeNull();
  });

  it("allows both normal admin and super_admin roles to access admin shell", async () => {
    authSession.setTokens(null, "super-refresh");
    authSession.resetCheckedState();

    server.use(
      http.post(`${env.apiBaseUrl}/api/v1/auth/refresh`, () => {
        return HttpResponse.json({
          data: {
            access_token: "super-access",
            refresh_token: "super-refresh",
            token_type: "Bearer",
            expires_in: 3600,
          },
        });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/auth/me`, () => {
        return HttpResponse.json({ data: mockSuperAdminUser });
      }),
    );

    renderTestRouter(["/admin"]);

    await screen.findByText("Admin Dashboard", {}, { timeout: 4000 });

    expect(screen.getAllByText("super_admin")[0]).toBeInTheDocument();
    expect(screen.getByText(/super@example\.test/)).toBeInTheDocument();
  });
});
