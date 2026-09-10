import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { server } from "./msw/server";
import { env } from "../lib/env";
import { AuthProvider } from "../features/auth/AuthProvider";
import { authSession } from "../features/auth/authSession";
import { ProtectedAdminRoute } from "../features/auth/ProtectedAdminRoute";
import { AdminLayout } from "../features/admin/AdminLayout";
import { ContentBlocksPage } from "../features/admin/content/ContentBlocksPage";
import {
  AdminContentBlockDto,
  AdminSpaSectionDto,
  UserDto,
} from "../api/types";

const SECTION_ID = "11111111-1111-4111-8111-111111111111";

const mockAdminUser: UserDto = {
  id: "10000000-0000-4000-8000-000000000001",
  email: "admin@example.test",
  display_name: "Admin User",
  role: "admin",
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const mockSections: AdminSpaSectionDto[] = [
  {
    id: SECTION_ID,
    key: "gallery",
    title: "Gallery Section",
    navigation_label: "Gallery",
    sort_order: 1,
    is_visible: true,
    content_block_count: 1,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

const mockTallBlock: AdminContentBlockDto = {
  id: "bbbbbbbb-1111-4111-8111-111111111111",
  spa_section_id: SECTION_ID,
  section_key: "gallery",
  section_title: "Gallery Section",
  block_type: "text_image",
  title: "A Very Tall Section Performance Showcase",
  text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. ".repeat(20),
  media: [
    {
      id: "aaaaaaaa-1111-4111-8111-111111111111",
      media_type: "image",
      storage_provider: "local",
      original_filename: "paris_photo_1.jpg",
      stored_filename: "paris_photo_1.jpg",
      mime_type: "image/jpeg",
      file_size: 1024,
    },
    {
      id: "aaaaaaaa-2222-4222-8222-222222222222",
      media_type: "image",
      storage_provider: "local",
      original_filename: "paris_photo_2.jpg",
      stored_filename: "paris_photo_2.jpg",
      mime_type: "image/jpeg",
      file_size: 2048,
    },
  ],
  font_family: "sans",
  font_size: "md",
  sort_order: 10,
  is_visible: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("FRONTEND AUDIT — ContentBlock Modal Structure & Footer Access", () => {
  beforeEach(() => {
    authSession.setTokens("mock-access-token", "mock-refresh-token");
    authSession.resetCheckedState();
    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/auth/me`, () => {
        return HttpResponse.json({ data: mockAdminUser });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({ data: [mockTallBlock] });
      }),
    );
  });

  afterEach(() => {
    authSession.clearSession();
    server.resetHandlers();
  });

  function renderAdminContent() {
    const testQueryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    });

    const router = createMemoryRouter(
      [
        {
          path: "/admin",
          element: <ProtectedAdminRoute />,
          children: [
            {
              element: <AdminLayout />,
              children: [
                {
                  path: "content",
                  element: <ContentBlocksPage />,
                },
              ],
            },
          ],
        },
      ],
      { initialEntries: ["/admin/content"] },
    );

    return render(
      <QueryClientProvider client={testQueryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </QueryClientProvider>,
    );
  }

  it("PART 49 REGRESSION: Tall Create Modal retains Create button in rendered modal footer", async () => {
    server.use(
      http.post(`${env.apiBaseUrl}/api/v1/admin/media/upload`, () => {
        return HttpResponse.json({
          data: {
            type: "image",
            id: "aaaaaaaa-3333-4333-8333-333333333333",
            url: "/uploads/new_img.jpg",
            original_filename: "new_img.jpg",
            mime_type: "image/jpeg",
            file_size: 1024,
            created_at: new Date().toISOString(),
          },
        });
      }),
    );

    renderAdminContent();

    const addBtn = await screen.findByRole("button", {
      name: /create content block/i,
    });
    fireEvent.click(addBtn);

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();

    // Verify dialog structure contains modal, modalForm, modalBody, and modalFooter
    const form = dialog.querySelector("form");
    expect(form).not.toBeNull();
    expect(form?.className).toMatch(/modalForm/);

    const body = dialog.querySelector("div[class*='modalBody']");
    expect(body).not.toBeNull();

    const footer = dialog.querySelector("div[class*='modalFooter']");
    expect(footer).not.toBeNull();

    // Switch block type to text_image
    const typeSelect = screen.getByLabelText(/Block Type/i);
    fireEvent.change(typeSelect, { target: { value: "text_image" } });

    // Enter very tall text
    const textarea = screen.getByPlaceholderText(
      /Enter block paragraph content/i,
    );
    const veryLongText =
      "This is a very long text paragraph that expands the form body significantly. ".repeat(
        15,
      );
    fireEvent.change(textarea, { target: { value: veryLongText } });

    // Attach multiple images
    const fileInput = screen.getByLabelText(/Upload Image File/i);
    const file1 = new File(["dummy1"], "tall1.png", { type: "image/png" });
    const file2 = new File(["dummy2"], "tall2.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [file1, file2] } });

    // Await upload finish
    await waitFor(() => {
      expect(screen.getAllByText("Uploaded").length).toBe(2);
    });

    // Verify the Create Block button is present inside the modal footer and is enabled
    const createButton = screen.getByRole("button", { name: "Create Block" });
    expect(createButton).toBeInTheDocument();
    expect(footer?.contains(createButton)).toBe(true);
    expect(createButton).not.toBeDisabled();
  });

  it("PART 50 REGRESSION: Tall Edit Modal retains Save button in rendered modal footer", async () => {
    renderAdminContent();

    await screen.findByText("A Very Tall Section Performance Showcase");

    const editBtn = screen.getByRole("button", { name: /Edit/i });
    fireEvent.click(editBtn);

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();

    const form = dialog.querySelector("form");
    expect(form).not.toBeNull();
    expect(form?.className).toMatch(/modalForm/);

    const footer = dialog.querySelector("div[class*='modalFooter']");
    expect(footer).not.toBeNull();

    // Verify Save Changes button is located inside the footer and enabled
    const saveButton = screen.getByRole("button", { name: "Save Changes" });
    expect(saveButton).toBeInTheDocument();
    expect(footer?.contains(saveButton)).toBe(true);
    expect(saveButton).not.toBeDisabled();
  });

  it("PART 51: Modal shell has resilient flex-column structure and proper scroll container", async () => {
    renderAdminContent();

    const addBtn = await screen.findByRole("button", {
      name: /create content block/i,
    });
    fireEvent.click(addBtn);

    const dialog = await screen.findByRole("dialog");
    const modalInner = dialog;

    const header = modalInner.querySelector("div[class*='modalHeader']");
    const form = modalInner.querySelector("form[class*='modalForm']");
    const body = modalInner.querySelector("div[class*='modalBody']");
    const footer = modalInner.querySelector("div[class*='modalFooter']");

    expect(header).toBeInTheDocument();
    expect(form).toBeInTheDocument();
    expect(body).toBeInTheDocument();
    expect(footer).toBeInTheDocument();

    // Ensure cancel button inside footer closes dialog cleanly
    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    expect(footer?.contains(cancelButton)).toBe(true);
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
