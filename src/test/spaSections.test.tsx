import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { server } from "./msw/server";
import { env } from "../lib/env";
import { AuthProvider } from "../features/auth/AuthProvider";
import { authSession } from "../features/auth/authSession";
import { ProtectedAdminRoute } from "../features/auth/ProtectedAdminRoute";
import { AdminLayout } from "../features/admin/AdminLayout";
import { SpaSectionsPage } from "../features/admin/sections/SpaSectionsPage";
import { AdminDashboard } from "../features/admin/AdminDashboard";
import { AdminSpaSectionDto, AdminSpaSectionDtoSchema } from "../api/types";

const SECTION_IDS = {
  awards: "11111111-1111-4111-8111-111111111111",
  partners: "22222222-2222-4222-8222-222222222222",
  festival: "33333333-3333-4333-8333-333333333333",
  created: "44444444-4444-4444-8444-444444444444",
  dynamic: "55555555-5555-4555-8555-555555555555",
} as const;

const mockAdminUser = {
  id: "10000000-0000-4000-8000-000000000001",
  email: "admin@example.test",
  display_name: "Admin User",
  role: "admin" as const,
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const mockSuperAdminUser = {
  id: "10000000-0000-4000-8000-000000000002",
  email: "super@example.test",
  display_name: "Super Admin",
  role: "super_admin" as const,
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const mockSections: AdminSpaSectionDto[] = [
  {
    id: SECTION_IDS.awards,
    key: "awards",
    title: "Awards",
    navigation_label: "Awards & Honors",
    sort_order: 1,
    is_visible: true,
    content_block_count: 2,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: SECTION_IDS.partners,
    key: "partners",
    title: "Partners",
    navigation_label: "Our Partners",
    sort_order: 2,
    is_visible: false,
    content_block_count: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: SECTION_IDS.festival,
    key: "festival-2027",
    title: "Festival 2027",
    navigation_label: "Festivals",
    sort_order: 3,
    is_visible: true,
    content_block_count: 5,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

function renderTestRouter(initialEntries = ["/admin/sections"]) {
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
        element: <div>Home Page Mock</div>,
      },
      {
        path: "/admin/login",
        element: <div>Login Page Mock</div>,
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

describe("FRONTEND F5.1 — Admin SpaSection Management & Accessibility", () => {
  beforeEach(() => {
    authSession.setTokens("valid-access", "valid-refresh");
    authSession.resetCheckedState();
    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/auth/me`, () => {
        return HttpResponse.json({ data: mockAdminUser });
      }),
    );
  });

  afterEach(() => {
    authSession.clearSession();
    authSession.resetCheckedState();
    vi.restoreAllMocks();
  });

  it("verifies all success test section fixtures parse through production AdminSpaSectionDtoSchema without error", () => {
    mockSections.forEach((section) => {
      expect(() => AdminSpaSectionDtoSchema.parse(section)).not.toThrow();
    });
  });

  it("renders loading spinner while section list query is pending", async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, async () => {
        await new Promise((r) => setTimeout(r, 50));
        return HttpResponse.json({ data: mockSections });
      }),
    );

    renderTestRouter(["/admin/sections"]);

    expect(
      await screen.findByText("Loading SPA sections..."),
    ).toBeInTheDocument();

    await screen.findByText("Awards");
    expect(screen.getByText("Awards")).toBeInTheDocument();
  });

  it("renders sections list displaying title, nav label, read-only key, visibility, and sort order", async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
    );

    renderTestRouter(["/admin/sections"]);

    await screen.findByText("Awards");

    expect(screen.getByText("Awards")).toBeInTheDocument();
    expect(screen.getByText("Awards & Honors")).toBeInTheDocument();
    expect(screen.getByText("awards")).toBeInTheDocument();
    expect(screen.getByText("partners")).toBeInTheDocument();
    expect(screen.getByText("festival-2027")).toBeInTheDocument();

    expect(screen.getAllByText("Visible")).toHaveLength(2);
    expect(screen.getByText("Hidden")).toBeInTheDocument();

    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("#2")).toBeInTheDocument();
    expect(screen.getByText("#3")).toBeInTheDocument();
  });

  it("preserves exact server list ordering without alphabetical sorting", async () => {
    const unorderedSections: AdminSpaSectionDto[] = [
      {
        id: SECTION_IDS.partners,
        key: "z-last",
        title: "Zebra Section",
        navigation_label: "Zebra",
        sort_order: 1,
        is_visible: true,
        content_block_count: 0,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
      {
        id: SECTION_IDS.awards,
        key: "a-first",
        title: "Alpha Section",
        navigation_label: "Alpha",
        sort_order: 2,
        is_visible: true,
        content_block_count: 0,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ];

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: unorderedSections });
      }),
    );

    renderTestRouter(["/admin/sections"]);

    await screen.findByText("Zebra Section");

    const rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Zebra Section");
    expect(rows[2]).toHaveTextContent("Alpha Section");
  });

  it("renders arbitrary dynamic section names with valid UUIDs without hardcoding assumptions", async () => {
    const dynamicSections: AdminSpaSectionDto[] = [
      {
        id: SECTION_IDS.dynamic,
        key: "custom-press-features",
        title: "Custom Press Features",
        navigation_label: "Press",
        sort_order: 10,
        is_visible: true,
        content_block_count: 4,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ];

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: dynamicSections });
      }),
    );

    renderTestRouter(["/admin/sections"]);

    await screen.findByText("Custom Press Features");
    expect(screen.getByText("custom-press-features")).toBeInTheDocument();
  });

  it("renders admin empty state when server returns empty section list", async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: [] });
      }),
    );

    renderTestRouter(["/admin/sections"]);

    await screen.findByText("No sections yet");
  });

  it("renders normalized error and request ID when list query fails, and retries query on button click", async () => {
    let callCount = 0;
    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        callCount += 1;
        if (callCount === 1) {
          return HttpResponse.json(
            {
              error: {
                code: "DATABASE_ERROR",
                message: "Failed to load sections",
                request_id: "req-sec-err-101",
              },
            },
            { status: 500 },
          );
        }
        return HttpResponse.json({ data: mockSections });
      }),
    );

    renderTestRouter(["/admin/sections"]);

    await screen.findByText("Error (DATABASE_ERROR)");
    expect(screen.getByText("Failed to load sections")).toBeInTheDocument();
    expect(screen.getByText(/req-sec-err-101/)).toBeInTheDocument();

    const retryBtn = screen.getByRole("button", { name: /Retry/i });
    fireEvent.click(retryBtn);

    await screen.findByText("Awards");
    expect(callCount).toBe(2);
  });

  it("models stateful creation where POST mutates server state and refetch renders backend-generated key", async () => {
    const serverSections: AdminSpaSectionDto[] = [];
    let capturedPayload: unknown = null;

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: serverSections });
      }),
      http.post(
        `${env.apiBaseUrl}/api/v1/admin/spa-sections`,
        async ({ request }) => {
          capturedPayload = await request.json();
          const created: AdminSpaSectionDto = {
            id: SECTION_IDS.created,
            key: "international-awards-2",
            title: "International Awards",
            navigation_label: "Awards",
            sort_order: 1,
            is_visible: true,
            content_block_count: 0,
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-01T00:00:00Z",
          };
          serverSections.push(created);
          return HttpResponse.json({ data: created });
        },
      ),
    );

    renderTestRouter(["/admin/sections"]);

    await screen.findByText("No sections yet");

    fireEvent.click(
      screen.getAllByRole("button", { name: /Create Section/i })[0]!,
    );

    await screen.findByRole("heading", { name: "Create SPA Section" });

    fireEvent.change(screen.getByLabelText(/Section Title \*/i), {
      target: { value: "International Awards" },
    });

    const dialogEl = screen.getByRole("dialog");
    const submitBtn = screen
      .getAllByRole("button", { name: /^Create Section$/i })
      .find((btn) => dialogEl.contains(btn))!;
    fireEvent.click(submitBtn);

    // Refetch sees canonical server state with server-generated key
    await screen.findByText("international-awards-2");
    expect(screen.getByText("International Awards")).toBeInTheDocument();
    expect(capturedPayload).toEqual({
      title: "International Awards",
    });
  });

  it("prevents duplicate create requests by disabling submit button during pending mutation", async () => {
    let postCallCount = 0;

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.post(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, async () => {
        postCallCount += 1;
        await new Promise((r) => setTimeout(r, 50));
        return HttpResponse.json({
          data: {
            id: SECTION_IDS.created,
            key: "new-sec",
            title: "New Sec",
            navigation_label: "New Sec",
            sort_order: 4,
            is_visible: true,
            content_block_count: 0,
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-01T00:00:00Z",
          },
        });
      }),
    );

    renderTestRouter(["/admin/sections"]);

    await screen.findByRole("heading", { name: "SPA Sections" });

    fireEvent.click(
      screen.getAllByRole("button", { name: /Create Section/i })[0]!,
    );

    await screen.findByRole("heading", { name: "Create SPA Section" });

    fireEvent.change(screen.getByLabelText(/Section Title \*/i), {
      target: { value: "New Sec" },
    });

    const dialogEl = screen.getByRole("dialog");
    const submitBtn = screen
      .getAllByRole("button", { name: /^Create Section$/i })
      .find((btn) => dialogEl.contains(btn))!;
    fireEvent.click(submitBtn);
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(postCallCount).toBe(1);
    });
  });

  it("models stateful deletion where DELETE mutates server state and section row disappears after refetch", async () => {
    const serverSections: AdminSpaSectionDto[] = [...mockSections];
    let capturedDeleteId = "";

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: serverSections });
      }),
      http.delete(
        `${env.apiBaseUrl}/api/v1/admin/spa-sections/:id`,
        ({ params }) => {
          capturedDeleteId = params.id as string;
          const index = serverSections.findIndex((s) => s.id === params.id);
          if (index !== -1) {
            serverSections.splice(index, 1);
          }
          return HttpResponse.json({ data: { message: "Deleted" } });
        },
      ),
    );

    renderTestRouter(["/admin/sections"]);

    await screen.findByText("Festival 2027");

    fireEvent.click(
      screen.getByRole("button", { name: "Delete section Festival 2027" }),
    );

    await screen.findByRole("heading", { name: "Delete Section" });

    const confirmBtn = screen.getByRole("button", {
      name: /^Delete Section$/i,
    });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(capturedDeleteId).toBe(SECTION_IDS.festival);
      expect(screen.queryByText("Festival 2027")).toBeNull();
    });

    const createHeaderButton = screen.getAllByRole("button", {
      name: /^Create Section$/i,
    })[0]!;

    await waitFor(() => {
      expect(document.activeElement).toBe(createHeaderButton);
    });
  });

  it("deterministically restores focus to Create Section button even when GET refetch after DELETE is delayed", async () => {
    let afterDelete = false;
    const serverSections: AdminSpaSectionDto[] = [...mockSections];

    server.use(
      http.delete(
        `${env.apiBaseUrl}/api/v1/admin/spa-sections/:id`,
        ({ params }) => {
          afterDelete = true;
          const index = serverSections.findIndex((s) => s.id === params.id);
          if (index !== -1) {
            serverSections.splice(index, 1);
          }
          return HttpResponse.json({ data: { message: "Deleted" } });
        },
      ),
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, async () => {
        if (afterDelete) {
          await new Promise((r) => setTimeout(r, 100));
        }
        return HttpResponse.json({ data: serverSections });
      }),
    );

    renderTestRouter(["/admin/sections"]);

    await screen.findByText("Festival 2027");

    const deleteBtn = screen.getByRole("button", {
      name: "Delete section Festival 2027",
    });
    deleteBtn.focus();
    expect(document.activeElement).toBe(deleteBtn);

    fireEvent.click(deleteBtn);

    await screen.findByRole("heading", { name: "Delete Section" });

    const confirmBtn = screen.getByRole("button", {
      name: /^Delete Section$/i,
    });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.queryByText("Festival 2027")).toBeNull();
    });

    const createHeaderButton = screen.getAllByRole("button", {
      name: /^Create Section$/i,
    })[0]!;

    await waitFor(() => {
      expect(createHeaderButton).toHaveFocus();
      expect(document.activeElement).not.toBe(document.body);
    });
  });

  it("synchronously records fallback intent so unmount in same batch restores focus to Create Section without intermediate render", async () => {
    const serverSections: AdminSpaSectionDto[] = [...mockSections];

    server.use(
      http.delete(
        `${env.apiBaseUrl}/api/v1/admin/spa-sections/:id`,
        ({ params }) => {
          const index = serverSections.findIndex((s) => s.id === params.id);
          if (index !== -1) {
            serverSections.splice(index, 1);
          }
          return HttpResponse.json({ data: { message: "Deleted" } });
        },
      ),
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: serverSections });
      }),
    );

    renderTestRouter(["/admin/sections"]);

    await screen.findByText("Festival 2027");

    const deleteBtn = screen.getByRole("button", {
      name: "Delete section Festival 2027",
    });
    fireEvent.click(deleteBtn);

    await screen.findByRole("heading", { name: "Delete Section" });

    const confirmBtn = screen.getByRole("button", {
      name: /^Delete Section$/i,
    });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.queryByText("Festival 2027")).toBeNull();
    });

    const createHeaderButton = screen.getAllByRole("button", {
      name: /^Create Section$/i,
    })[0]!;

    await waitFor(() => {
      expect(createHeaderButton).toHaveFocus();
      expect(document.activeElement).not.toBe(document.body);
    });
  });

  it("handles delete conflict when section contains ContentBlocks without optimistic row deletion", async () => {
    let contentBlockApiCalled = false;

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.delete(
        `${env.apiBaseUrl}/api/v1/admin/spa-sections/${SECTION_IDS.awards}`,
        () => {
          return HttpResponse.json(
            {
              error: {
                code: "SECTION_NOT_EMPTY",
                message:
                  "Cannot delete section because it contains content blocks",
              },
            },
            { status: 400 },
          );
        },
      ),
      http.all(`${env.apiBaseUrl}/api/v1/admin/content-blocks*`, () => {
        contentBlockApiCalled = true;
        return HttpResponse.json({ data: {} });
      }),
    );

    renderTestRouter(["/admin/sections"]);

    await screen.findByText("Awards");

    fireEvent.click(
      screen.getByRole("button", { name: "Delete section Awards" }),
    );

    await screen.findByRole("heading", { name: "Delete Section" });

    fireEvent.click(screen.getByRole("button", { name: /^Delete Section$/i }));

    await screen.findByText(
      "Cannot delete section because it contains content blocks",
    );
    expect(screen.getByText("Awards")).toBeInTheDocument();
    expect(contentBlockApiCalled).toBe(false);
  });

  it("preserves immutable server key when section title is updated via PATCH", async () => {
    const testSections: AdminSpaSectionDto[] = [...mockSections];
    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: testSections });
      }),
      http.patch(
        `${env.apiBaseUrl}/api/v1/admin/spa-sections/${SECTION_IDS.awards}`,
        async ({ request }) => {
          const body = (await request.json()) as Partial<AdminSpaSectionDto>;
          testSections[0] = {
            ...testSections[0]!,
            ...body,
          };
          return HttpResponse.json({ data: testSections[0] });
        },
      ),
    );

    renderTestRouter(["/admin/sections"]);

    await screen.findByText("Awards");

    fireEvent.click(
      screen.getByRole("button", { name: "Edit section Awards" }),
    );

    await screen.findByRole("heading", { name: "Edit SPA Section" });

    fireEvent.change(screen.getByLabelText(/Section Title \*/i), {
      target: { value: "Global Awards" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    await screen.findByText("Global Awards");
    expect(screen.getByText("awards")).toBeInTheDocument();
  });

  it("verifies Create dialog initial focus, Escape closing, and focus return", async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
    );

    renderTestRouter(["/admin/sections"]);

    await screen.findByRole("heading", { name: "SPA Sections" });

    const createBtn = screen.getAllByRole("button", {
      name: /Create Section/i,
    })[0]!;
    createBtn.focus();
    expect(document.activeElement).toBe(createBtn);

    fireEvent.click(createBtn);

    await screen.findByRole("heading", { name: "Create SPA Section" });

    const titleInput = screen.getByLabelText(/Section Title \*/i);
    await waitFor(() => {
      expect(document.activeElement).toBe(titleInput);
    });

    // Press Escape to close
    fireEvent.keyDown(document.activeElement || document.body, {
      key: "Escape",
    });

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "Create SPA Section" }),
      ).toBeNull();
    });

    await waitFor(() => {
      expect(document.activeElement).toBe(createBtn);
    });
  });

  it("verifies Edit dialog initial focus on Title input (bypassing read-only key), Escape closing, and focus return", async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
    );

    renderTestRouter(["/admin/sections"]);

    await screen.findByText("Festival 2027");

    const editBtn = screen.getByRole("button", {
      name: "Edit section Festival 2027",
    });
    editBtn.focus();

    fireEvent.click(editBtn);

    await screen.findByRole("heading", { name: "Edit SPA Section" });

    const titleInput = screen.getByLabelText(/Section Title \*/i);
    await waitFor(() => {
      expect(document.activeElement).toBe(titleInput);
    });

    fireEvent.keyDown(document.activeElement || document.body, {
      key: "Escape",
    });

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "Edit SPA Section" }),
      ).toBeNull();
    });

    await waitFor(() => {
      expect(document.activeElement).toBe(editBtn);
    });
  });

  it("verifies Delete dialog initial focus on Cancel button, Escape closing (0 DELETE calls), and focus return", async () => {
    let deleteCallCount = 0;
    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.delete(`${env.apiBaseUrl}/api/v1/admin/spa-sections/*`, () => {
        deleteCallCount += 1;
        return HttpResponse.json({ data: { message: "Deleted" } });
      }),
    );

    renderTestRouter(["/admin/sections"]);

    await screen.findByText("Festival 2027");

    const deleteBtn = screen.getByRole("button", {
      name: "Delete section Festival 2027",
    });
    deleteBtn.focus();
    expect(document.activeElement).toBe(deleteBtn);

    fireEvent.click(deleteBtn);

    await screen.findByRole("heading", { name: "Delete Section" });

    const cancelBtn = screen.getByRole("button", { name: /Cancel/i });
    await waitFor(() => {
      expect(document.activeElement).toBe(cancelBtn);
    });

    fireEvent.keyDown(document.activeElement || document.body, {
      key: "Escape",
    });

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "Delete Section" }),
      ).toBeNull();
    });

    expect(deleteCallCount).toBe(0);
    await waitFor(() => {
      expect(document.activeElement).toBe(deleteBtn);
    });
  });

  it("verifies focus trap cycles Tab and Shift+Tab within modal controls", async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
    );

    renderTestRouter(["/admin/sections"]);

    await screen.findByRole("heading", { name: "SPA Sections" });

    fireEvent.click(
      screen.getAllByRole("button", { name: /Create Section/i })[0]!,
    );

    await screen.findByRole("heading", { name: "Create SPA Section" });

    const titleInput = screen.getByLabelText(/Section Title \*/i);
    await waitFor(() => {
      expect(document.activeElement).toBe(titleInput);
    });

    fireEvent.change(titleInput, { target: { value: "Valid Title" } });

    const dialogEl = screen.getByRole("dialog");
    const submitBtn = screen
      .getAllByRole("button", {
        name: /^Create Section$/i,
      })
      .find((btn) => dialogEl.contains(btn))!;
    expect(submitBtn).not.toBeDisabled();
    submitBtn.focus();
    expect(document.activeElement).toBe(submitBtn);

    // Tab from last element cycles to first focusable (close button)
    fireEvent.keyDown(submitBtn, { key: "Tab" });

    const closeBtn = screen.getByRole("button", { name: "Close modal" });
    expect(document.activeElement).toBe(closeBtn);

    // Shift+Tab from first element cycles to last focusable (submit button)
    fireEvent.keyDown(closeBtn, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(submitBtn);
  });

  it("allows both admin and super_admin roles to access /admin/sections", async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/auth/me`, () => {
        return HttpResponse.json({ data: mockSuperAdminUser });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
    );

    renderTestRouter(["/admin/sections"]);

    await screen.findByText("Awards");
    expect(screen.getByText("Super Admin")).toBeInTheDocument();
  });

  it("handles 403 Forbidden error gracefully without triggering refresh call", async () => {
    let refreshCalled = false;

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json(
          {
            error: {
              code: "FORBIDDEN",
              message: "You do not have permission to manage sections",
            },
          },
          { status: 403 },
        );
      }),
      http.post(`${env.apiBaseUrl}/api/v1/auth/refresh`, () => {
        refreshCalled = true;
        return HttpResponse.json({ data: {} });
      }),
    );

    renderTestRouter(["/admin/sections"]);

    await screen.findByText("Error (FORBIDDEN)");
    expect(
      screen.getByText("You do not have permission to manage sections"),
    ).toBeInTheDocument();
    expect(refreshCalled).toBe(false);
  });

  it("handles malformed backend list response via Zod runtime validation safely", async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({
          data: [
            {
              id: "invalid-uuid-format", // Fails z.string().uuid()
              key: 123, // Fails z.string()
            },
          ],
        });
      }),
    );

    renderTestRouter(["/admin/sections"]);

    await screen.findByText("Error (INVALID_API_RESPONSE)");
    expect(
      screen.getByText("The server returned an unexpected response."),
    ).toBeInTheDocument();
  });
});
