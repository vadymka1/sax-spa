import { render, screen, fireEvent, cleanup } from "@testing-library/react";
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
import { ContactMessagesPage } from "../features/admin/contact-messages/ContactMessagesPage";
import { UsersPage } from "../features/admin/users/UsersPage";
import { PublicPage } from "../features/public-page/PublicPage";
import { apiClient } from "../api/client";
import { authApi } from "../api/authApi";
import { AuthResponseDtoSchema } from "../api/types";

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
              {
                path: "contact-messages",
                element: <ContactMessagesPage />,
              },
              {
                path: "users",
                element: <UsersPage />,
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

describe("FRONTEND AUTH V3 — Persistent Session Restore (Auth Contract C)", () => {
  beforeEach(() => {
    authSession.clearSession();
    authSession.resetCheckedState();
  });

  afterEach(() => {
    cleanup();
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

  it("TEST — LOGIN CONTRACT: login request sends email/password with withCredentials=true and stores access token + user in memory with no refresh token", async () => {
    let capturedPayload: unknown = null;
    let capturedCredentials: unknown = null;

    server.use(
      http.post(`${env.apiBaseUrl}/api/v1/auth/login`, async ({ request }) => {
        capturedPayload = await request.json();
        capturedCredentials = request.credentials;
        return HttpResponse.json({
          data: {
            access_token: "token-login-v3",
            token_type: "Bearer",
            expires_in: 900,
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
    // Axios withCredentials sends credentials='include'
    expect(capturedCredentials).toBe("include");
    expect(authSession.getAccessToken()).toBe("token-login-v3");
    // Assert no refresh token or legacy setTokens in authSession or browser storage
    expect("refreshToken" in authSession).toBe(false);
    expect("getRefreshToken" in authSession).toBe(false);
    expect("setTokens" in authSession).toBe(false);
    expect(localStorage.getItem("access_token")).toBeNull();
    expect(localStorage.getItem("refresh_token")).toBeNull();
    expect(sessionStorage.getItem("access_token")).toBeNull();
    expect(sessionStorage.getItem("refresh_token")).toBeNull();
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

  it("TEST — REFRESH CONTRACT: authApi.refresh sends empty body and withCredentials=true", async () => {
    let capturedBody: unknown = null;
    let capturedCredentials: unknown = null;

    server.use(
      http.post(
        `${env.apiBaseUrl}/api/v1/auth/refresh`,
        async ({ request }) => {
          capturedCredentials = request.credentials;
          const text = await request.text();
          capturedBody = text ? JSON.parse(text) : null;
          return HttpResponse.json({
            data: {
              access_token: "rotated-access-v3",
              token_type: "Bearer",
              expires_in: 900,
              user: mockActiveUser,
            },
          });
        },
      ),
    );

    const result = await authApi.refresh();

    expect(capturedBody).toBeNull();
    expect(capturedCredentials).toBe("include");
    expect(result.access_token).toBe("rotated-access-v3");
    expect(result.user.email).toBe("admin@example.test");
    expect("refresh_token" in result).toBe(false);
  });

  it("TEST — LOGOUT CONTRACT: authApi.logout sends empty body with withCredentials=true", async () => {
    let capturedBody: unknown = null;
    let capturedCredentials: unknown = null;

    server.use(
      http.post(`${env.apiBaseUrl}/api/v1/auth/logout`, async ({ request }) => {
        capturedCredentials = request.credentials;
        const text = await request.text();
        capturedBody = text ? JSON.parse(text) : null;
        return HttpResponse.json({
          data: { message: "Successfully logged out" },
        });
      }),
    );

    await authApi.logout();

    expect(capturedBody).toBeNull();
    expect(capturedCredentials).toBe("include");
  });

  it("TEST — INITIAL SESSION RESTORE: start app with access token = null, refresh succeeds via cookie, authenticated state restored", async () => {
    let refreshCallCount = 0;
    authSession.setAccessToken(null);
    authSession.resetCheckedState();

    server.use(
      http.post(`${env.apiBaseUrl}/api/v1/auth/refresh`, () => {
        refreshCallCount += 1;
        return HttpResponse.json({
          data: {
            access_token: "restored-token-999",
            token_type: "Bearer",
            expires_in: 900,
            user: mockActiveUser,
          },
        });
      }),
    );

    renderTestRouter(["/admin"]);

    await screen.findByText("Admin Dashboard", {}, { timeout: 4000 });

    expect(refreshCallCount).toBe(1);
    expect(authSession.getAccessToken()).toBe("restored-token-999");
    expect(screen.getByText(/admin@example\.test/)).toBeInTheDocument();
  });

  it("TEST — F5 CONTACT MESSAGES REGRESSION (MANDATORY): direct navigation/F5 to /admin/contact-messages with no in-memory token restores session and renders ContactMessagesPage with no redirect to login", async () => {
    let refreshCallCount = 0;
    authSession.setAccessToken(null);
    authSession.resetCheckedState();

    server.use(
      http.post(`${env.apiBaseUrl}/api/v1/auth/refresh`, () => {
        refreshCallCount += 1;
        return HttpResponse.json({
          data: {
            access_token: "f5-restored-token",
            token_type: "Bearer",
            expires_in: 900,
            user: mockActiveUser,
          },
        });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/contact-messages`, () => {
        return HttpResponse.json({
          data: [
            {
              id: "b1b2c3d4-e5f6-4890-abcd-ef1234567890",
              name: "Alice F5",
              email: "alice@f5.test",
              subject: "F5 Regression Test Subject",
              message: "Testing F5 refresh session persistence",
              email_status: "sent",
              email_error: null,
              email_sent_at: "2026-09-13T10:00:00Z",
              is_read: false,
              read_at: null,
              created_at: "2026-09-13T10:00:00Z",
              updated_at: "2026-09-13T10:00:00Z",
            },
          ],
        });
      }),
    );

    renderTestRouter(["/admin/contact-messages"]);

    // Must render ContactMessagesPage with the message
    await screen.findByText("Contact Messages", {}, { timeout: 4000 });
    expect(await screen.findByText("Alice F5")).toBeInTheDocument();
    expect(screen.getByText("F5 Regression Test Subject")).toBeInTheDocument();

    // Login form MUST NOT appear
    expect(
      screen.queryByRole("button", { name: /Sign In to CMS/i }),
    ).toBeNull();
    expect(
      screen.queryByText(/Sign in to access administration tools/i),
    ).toBeNull();
    expect(refreshCallCount).toBe(1);
    expect(authSession.getAccessToken()).toBe("f5-restored-token");
  });

  it("TEST — CHECKING STATE: during delayed refresh response, ProtectedAdminRoute shows loading spinner and does not flash login", async () => {
    let resolveRefresh: (value: Response) => void;
    const refreshPromise = new Promise<Response>((resolve) => {
      resolveRefresh = resolve;
    });

    authSession.setAccessToken(null);
    authSession.resetCheckedState();

    server.use(
      http.post(`${env.apiBaseUrl}/api/v1/auth/refresh`, () => {
        return refreshPromise;
      }),
    );

    renderTestRouter(["/admin"]);

    // Checking state spinner must be visible
    expect(screen.getByText(/Checking session.../i)).toBeInTheDocument();
    // Login form must NOT be visible
    expect(
      screen.queryByRole("button", { name: /Sign In to CMS/i }),
    ).toBeNull();

    // Complete the refresh with 401
    resolveRefresh!(
      HttpResponse.json(
        { error: { code: "UNAUTHORIZED", message: "No session cookie" } },
        { status: 401 },
      ),
    );

    // After 401, now it redirects to login
    await screen.findByRole("button", { name: /Sign In to CMS/i });
  });

  it("TEST — REFRESH 401: initial refresh returns 401, sets unauthenticated, redirects to /admin/login with exactly 1 call and no retry loop", async () => {
    let refreshCallCount = 0;
    authSession.setAccessToken(null);
    authSession.resetCheckedState();

    server.use(
      http.post(`${env.apiBaseUrl}/api/v1/auth/refresh`, () => {
        refreshCallCount += 1;
        return HttpResponse.json(
          { error: { code: "UNAUTHORIZED", message: "No refresh session" } },
          { status: 401 },
        );
      }),
    );

    renderTestRouter(["/admin"]);

    await screen.findByRole("button", { name: /Sign In to CMS/i });
    expect(screen.queryByText("Admin Dashboard")).toBeNull();
    expect(refreshCallCount).toBe(1);
    expect(authSession.getAccessToken()).toBeNull();
  });

  it("TEST — DIRECT ADMIN ROUTE: direct navigation to /admin/users restores super_admin session via cookie refresh", async () => {
    authSession.setAccessToken(null);
    authSession.resetCheckedState();

    server.use(
      http.post(`${env.apiBaseUrl}/api/v1/auth/refresh`, () => {
        return HttpResponse.json({
          data: {
            access_token: "super-restored-token",
            token_type: "Bearer",
            expires_in: 900,
            user: mockSuperAdminUser,
          },
        });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/users`, () => {
        return HttpResponse.json({
          data: [mockSuperAdminUser],
        });
      }),
    );

    renderTestRouter(["/admin/users"]);

    await screen.findByRole("heading", { name: "Users" }, { timeout: 4000 });
    expect(screen.getAllByText("super_admin")[0]).toBeInTheDocument();
    await screen.findByText(/super@example\.test/, {}, { timeout: 4000 });
  });

  it("TEST — LOGOUT: clicking Log Out sends POST /auth/logout with empty body, clears access token, and redirects to /admin/login", async () => {
    let logoutCallCount = 0;
    let capturedLogoutBody: unknown = null;

    authSession.setAccessToken("token-to-logout");
    authSession.resetCheckedState();

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/auth/me`, () => {
        return HttpResponse.json({ data: mockActiveUser });
      }),
      http.post(`${env.apiBaseUrl}/api/v1/auth/logout`, async ({ request }) => {
        logoutCallCount += 1;
        const text = await request.text();
        capturedLogoutBody = text ? JSON.parse(text) : null;
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

    expect(logoutCallCount).toBe(1);
    expect(capturedLogoutBody).toBeNull();
    expect(authSession.getAccessToken()).toBeNull();
  });

  it("TEST — LOGOUT FAILURE: network failure on POST /auth/logout still safely clears local memory state and redirects to login", async () => {
    authSession.setAccessToken("token-to-fail-logout");
    authSession.resetCheckedState();

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/auth/me`, () => {
        return HttpResponse.json({ data: mockActiveUser });
      }),
      http.post(`${env.apiBaseUrl}/api/v1/auth/logout`, () => {
        return HttpResponse.json(
          { error: { code: "SERVER_ERROR", message: "Logout failed" } },
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

  it("TEST — SINGLE-FLIGHT 401: concurrent 401 responses trigger exactly ONE single-flight refresh request and retry once", async () => {
    let refreshCallCount = 0;
    authSession.setAccessToken("stale-access-token");

    server.use(
      http.post(`${env.apiBaseUrl}/api/v1/auth/refresh`, async () => {
        refreshCallCount += 1;
        await new Promise((r) => setTimeout(r, 20));
        return HttpResponse.json({
          data: {
            access_token: "single-flight-v3-token",
            token_type: "Bearer",
            expires_in: 900,
            user: mockActiveUser,
          },
        });
      }),
      http.get(
        `${env.apiBaseUrl}/api/v1/public/test-protected`,
        ({ request }) => {
          const auth = request.headers.get("Authorization");
          if (auth !== "Bearer single-flight-v3-token") {
            return HttpResponse.json(
              { error: { code: "UNAUTHORIZED" } },
              { status: 401 },
            );
          }
          return HttpResponse.json({ data: "ok-recovered" });
        },
      ),
    );

    const [r1, r2, r3] = await Promise.all([
      apiClient.get("/api/v1/public/test-protected"),
      apiClient.get("/api/v1/public/test-protected"),
      apiClient.get("/api/v1/public/test-protected"),
    ]);

    expect(refreshCallCount).toBe(1);
    expect(r1.data.data).toBe("ok-recovered");
    expect(r2.data.data).toBe("ok-recovered");
    expect(r3.data.data).toBe("ok-recovered");
    expect(authSession.getAccessToken()).toBe("single-flight-v3-token");
  });

  it("TEST — REFRESH FAILURE DURING 401: refresh failure clears session, emits failure listener, and requests do not loop", async () => {
    let refreshCallCount = 0;
    let failureEmitted = false;

    authSession.setAccessToken("stale-token-dead");
    const unsubscribe = authSession.onAuthFailure(() => {
      failureEmitted = true;
    });

    server.use(
      http.post(`${env.apiBaseUrl}/api/v1/auth/refresh`, () => {
        refreshCallCount += 1;
        return HttpResponse.json(
          { error: { code: "UNAUTHORIZED", message: "Session expired" } },
          { status: 401 },
        );
      }),
      http.get(`${env.apiBaseUrl}/api/v1/public/test-protected-err`, () => {
        return HttpResponse.json(
          { error: { code: "UNAUTHORIZED" } },
          { status: 401 },
        );
      }),
    );

    await expect(
      apiClient.get("/api/v1/public/test-protected-err"),
    ).rejects.toThrow();

    expect(refreshCallCount).toBe(1);
    expect(authSession.getAccessToken()).toBeNull();
    expect(failureEmitted).toBe(true);

    unsubscribe();
  });

  it("TEST — STRICTMODE / DUPLICATE RESTORE: concurrent getOrStartRefresh callers share exactly 1 network request", async () => {
    let refreshCallCount = 0;
    authSession.setAccessToken(null);
    authSession.resetCheckedState();

    server.use(
      http.post(`${env.apiBaseUrl}/api/v1/auth/refresh`, async () => {
        refreshCallCount += 1;
        await new Promise((r) => setTimeout(r, 20));
        return HttpResponse.json({
          data: {
            access_token: "deduped-token-v3",
            token_type: "Bearer",
            expires_in: 900,
            user: mockActiveUser,
          },
        });
      }),
    );

    const [t1, t2, t3] = await Promise.all([
      authSession.getOrStartRefresh(),
      authSession.getOrStartRefresh(),
      authSession.getOrStartRefresh(),
    ]);

    expect(refreshCallCount).toBe(1);
    expect(t1).toBe("deduped-token-v3");
    expect(t2).toBe("deduped-token-v3");
    expect(t3).toBe("deduped-token-v3");
  });

  it("TEST — NO REFRESH TOKEN STORAGE: verifies zero refresh token storage variables, zero localStorage auth, zero sessionStorage auth", () => {
    // Audit authSession instance
    expect("refreshToken" in authSession).toBe(false);
    expect("getRefreshToken" in authSession).toBe(false);
    expect("setTokens" in authSession).toBe(false);

    // Audit localStorage
    expect(localStorage.getItem("access_token")).toBeNull();
    expect(localStorage.getItem("refresh_token")).toBeNull();
    expect(localStorage.getItem("auth")).toBeNull();

    // Audit sessionStorage
    expect(sessionStorage.getItem("access_token")).toBeNull();
    expect(sessionStorage.getItem("refresh_token")).toBeNull();
    expect(sessionStorage.getItem("auth")).toBeNull();
  });

  it("TEST — PUBLIC CONTACT: anonymous contact submission works with zero Bearer token and zero auth refresh dependency", async () => {
    let refreshCallCount = 0;
    let capturedAuthHeader: string | null = "initial";

    server.use(
      http.post(`${env.apiBaseUrl}/api/v1/auth/refresh`, () => {
        refreshCallCount += 1;
        return HttpResponse.json(
          { error: { code: "UNAUTHORIZED" } },
          { status: 401 },
        );
      }),
      http.post(`${env.apiBaseUrl}/api/v1/public/contact`, ({ request }) => {
        capturedAuthHeader = request.headers.get("Authorization");
        return HttpResponse.json({
          data: { success: true, message: "Message sent successfully" },
        });
      }),
    );

    const res = await apiClient.post("/api/v1/public/contact", {
      name: "Anonymous Fan",
      email: "fan@example.com",
      subject: "Great Concert",
      message: "Looking forward to your next tour!",
    });

    expect(res.data.data.success).toBe(true);
    expect(capturedAuthHeader).toBeNull();
    expect(refreshCallCount).toBe(0);
  });

  it("TEST — PUBLIC TESTIMONIALS: anonymous testimonial submission works with zero Bearer requirement", async () => {
    let refreshCallCount = 0;
    let capturedAuthHeader: string | null = "initial";

    server.use(
      http.post(`${env.apiBaseUrl}/api/v1/auth/refresh`, () => {
        refreshCallCount += 1;
        return HttpResponse.json(
          { error: { code: "UNAUTHORIZED" } },
          { status: 401 },
        );
      }),
      http.post(
        `${env.apiBaseUrl}/api/v1/public/testimonials`,
        ({ request }) => {
          capturedAuthHeader = request.headers.get("Authorization");
          return HttpResponse.json({
            data: {
              id: "t1b2c3d4-e5f6-4890-abcd-ef1234567890",
              author_name: "Anonymous Reviewer",
              rating: 5,
              content: "Incredible saxophone performance!",
              status: "pending",
              created_at: "2026-09-13T10:00:00Z",
            },
          });
        },
      ),
    );

    const res = await apiClient.post("/api/v1/public/testimonials", {
      author_name: "Anonymous Reviewer",
      rating: 5,
      content: "Incredible saxophone performance!",
    });

    expect(res.data.data.author_name).toBe("Anonymous Reviewer");
    expect(capturedAuthHeader).toBeNull();
    expect(refreshCallCount).toBe(0);
  });

  it("TEST — PUBLIC ROUTE /: public route / renders normally even if /auth/refresh returns 500 error", async () => {
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
            testimonials: [],
          },
        });
      }),
    );

    renderTestRouter(["/"]);

    await screen.findByText("Public SPA Page");
    expect(screen.getByText("Public SPA Page")).toBeInTheDocument();
  });

  it("TEST — ZOD STRICTNESS: response containing unexpected refresh_token fails validation under strict schema", () => {
    const invalidPayloadWithRefreshToken = {
      access_token: "token-v3",
      refresh_token: "unexpected-refresh-token",
      token_type: "Bearer",
      expires_in: 900,
      user: mockActiveUser,
    };

    expect(() => {
      AuthResponseDtoSchema.parse(invalidPayloadWithRefreshToken);
    }).toThrow();
  });

  it("restores intended destination after logging in from a protected deep link", async () => {
    server.use(
      http.post(`${env.apiBaseUrl}/api/v1/auth/login`, () => {
        return HttpResponse.json({
          data: {
            access_token: "token-deeplink-123",
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

  it("rejects inactive users returned from auth refresh and clears auth state", async () => {
    authSession.setAccessToken(null);
    authSession.resetCheckedState();

    server.use(
      http.post(`${env.apiBaseUrl}/api/v1/auth/refresh`, () => {
        return HttpResponse.json({
          data: {
            access_token: "inactive-access",
            token_type: "Bearer",
            expires_in: 3600,
            user: mockInactiveUser,
          },
        });
      }),
    );

    renderTestRouter(["/admin"]);

    await screen.findByRole("heading", { name: "SPA Saxophone CMS" });

    expect(authSession.getAccessToken()).toBeNull();
    expect(screen.queryByText("Admin Dashboard")).toBeNull();
  });
});
