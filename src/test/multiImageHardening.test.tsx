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
  AdminMediaDto,
  AdminSpaSectionDto,
  ContentBlockTypeSchema,
  CreateContentBlockRequest,
  FontFamilySchema,
  FontSizeSchema,
  UpdateContentBlockRequest,
  UserDto,
} from "../api/types";

const SECTION_ID = "11111111-1111-4111-8111-111111111111";

const MEDIA_IDS = {
  imgA: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  imgB: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  imgC: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
} as const;

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

const mockInitialBlock: AdminContentBlockDto = {
  id: "b1111111-1111-4111-8111-111111111111",
  spa_section_id: SECTION_ID,
  section_key: "gallery",
  section_title: "Gallery Section",
  block_type: "text_image",
  title: "Solo Performance",
  text: "Concert in Paris.",
  media: [
    {
      id: MEDIA_IDS.imgA,
      media_type: "image",
      storage_provider: "local",
      original_filename: "paris_1.jpg",
      stored_filename: "paris_1.jpg",
      mime_type: "image/jpeg",
      file_size: 1000,
    },
  ],
  font_family: "sans",
  font_size: "md",
  sort_order: 1,
  is_visible: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("FRONTEND V2.1 — Multi-Image Hardening & Type-Safe Form Boundaries", () => {
  beforeEach(() => {
    authSession.setTokens("mock-access-token", "mock-refresh-token");
    authSession.resetCheckedState();
    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/auth/me`, () => {
        return HttpResponse.json({ data: mockAdminUser });
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

  it("1. creates single-image block with canonical media_ids: [id] and omits media_id", async () => {
    let capturedPayload: CreateContentBlockRequest | null = null;

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({ data: [] });
      }),
      http.post(`${env.apiBaseUrl}/api/v1/admin/media/upload`, () => {
        const mediaDto: AdminMediaDto = {
          type: "image",
          id: MEDIA_IDS.imgA,
          url: "http://localhost:8000/media/imgA.jpg",
          original_filename: "photoA.jpg",
          mime_type: "image/jpeg",
          file_size: 5000,
          created_at: "2026-01-01T00:00:00Z",
        };
        return HttpResponse.json({ data: mediaDto });
      }),
      http.post(
        `${env.apiBaseUrl}/api/v1/admin/content-blocks`,
        async ({ request }) => {
          capturedPayload = (await request.json()) as CreateContentBlockRequest;
          return HttpResponse.json({
            data: {
              ...mockInitialBlock,
              ...capturedPayload,
              id: "new-block-id",
            },
          });
        },
      ),
    );

    renderAdminContent();
    await screen.findByRole("heading", { name: "Content Management" });

    fireEvent.click(
      await screen.findByRole("button", { name: "Create content block" }),
    );
    await screen.findByRole("heading", { name: "Create Content Block" });

    fireEvent.change(screen.getByLabelText("Block Type"), {
      target: { value: "text_image" },
    });
    fireEvent.change(screen.getByLabelText("Text Content *"), {
      target: { value: "Single image description" },
    });

    const fileInput = screen.getByLabelText("Upload Image File");
    const fileA = new File(["bytesA"], "photoA.jpg", { type: "image/jpeg" });
    fireEvent.change(fileInput, { target: { files: [fileA] } });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Create Block" }),
      ).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Block" }));

    await waitFor(() => {
      expect(capturedPayload).toEqual({
        spa_section_id: SECTION_ID,
        block_type: "text_image",
        text: "Single image description",
        media_ids: [MEDIA_IDS.imgA],
      });
      expect(capturedPayload).not.toHaveProperty("media_id");
    });
  });

  it("2. creates multi-image block with canonical media_ids: [id1, id2, id3] in defined order and omits media_id", async () => {
    let capturedPayload: CreateContentBlockRequest | null = null;
    const uploadedNames: string[] = [];

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({ data: [] });
      }),
      http.post(
        `${env.apiBaseUrl}/api/v1/admin/media/upload`,
        async ({ request }) => {
          const form = await request.formData();
          const file = form.get("file") as File;
          uploadedNames.push(file.name);

          const idMap: Record<string, string> = {
            "photo1.jpg": MEDIA_IDS.imgA,
            "photo2.jpg": MEDIA_IDS.imgB,
            "photo3.jpg": MEDIA_IDS.imgC,
          };
          const id = idMap[file.name] || MEDIA_IDS.imgA;

          return HttpResponse.json({
            data: {
              type: "image",
              id,
              url: `http://localhost:8000/media/${file.name}`,
              original_filename: file.name,
              mime_type: "image/jpeg",
              file_size: 5000,
              created_at: "2026-01-01T00:00:00Z",
            },
          });
        },
      ),
      http.post(
        `${env.apiBaseUrl}/api/v1/admin/content-blocks`,
        async ({ request }) => {
          capturedPayload = (await request.json()) as CreateContentBlockRequest;
          return HttpResponse.json({
            data: {
              ...mockInitialBlock,
              ...capturedPayload,
              id: "multi-block-id",
            },
          });
        },
      ),
    );

    renderAdminContent();
    await screen.findByRole("heading", { name: "Content Management" });

    fireEvent.click(
      await screen.findByRole("button", { name: "Create content block" }),
    );
    await screen.findByRole("heading", { name: "Create Content Block" });

    fireEvent.change(screen.getByLabelText("Block Type"), {
      target: { value: "text_image" },
    });
    fireEvent.change(screen.getByLabelText("Text Content *"), {
      target: { value: "Multi image album" },
    });

    const file1 = new File(["1"], "photo1.jpg", { type: "image/jpeg" });
    const file2 = new File(["2"], "photo2.jpg", { type: "image/jpeg" });
    const file3 = new File(["3"], "photo3.jpg", { type: "image/jpeg" });

    const fileInput = screen.getByLabelText("Upload Image File");
    fireEvent.change(fileInput, { target: { files: [file1, file2, file3] } });

    await waitFor(() => {
      expect(screen.getAllByText("Uploaded")).toHaveLength(3);
      expect(
        screen.getByRole("button", { name: "Create Block" }),
      ).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Block" }));

    await waitFor(() => {
      expect(capturedPayload).toEqual({
        spa_section_id: SECTION_ID,
        block_type: "text_image",
        text: "Multi image album",
        media_ids: [MEDIA_IDS.imgA, MEDIA_IDS.imgB, MEDIA_IDS.imgC],
      });
      expect(capturedPayload).not.toHaveProperty("media_id");
    });
  });

  it("3. handles partial upload failure: preserves successful uploads, shows failed item with retry button, and disables Create Block", async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({ data: [] });
      }),
      http.post(
        `${env.apiBaseUrl}/api/v1/admin/media/upload`,
        async ({ request }) => {
          const form = await request.formData();
          const file = form.get("file") as File;

          if (file.name === "fail.jpg") {
            return HttpResponse.json(
              { error: { message: "Simulated file upload error" } },
              { status: 500 },
            );
          }

          return HttpResponse.json({
            data: {
              type: "image",
              id: MEDIA_IDS.imgA,
              url: `http://localhost:8000/media/${file.name}`,
              original_filename: file.name,
              mime_type: "image/jpeg",
              file_size: 5000,
              created_at: "2026-01-01T00:00:00Z",
            },
          });
        },
      ),
    );

    renderAdminContent();
    await screen.findByRole("heading", { name: "Content Management" });

    fireEvent.click(
      await screen.findByRole("button", { name: "Create content block" }),
    );
    await screen.findByRole("heading", { name: "Create Content Block" });

    fireEvent.change(screen.getByLabelText("Block Type"), {
      target: { value: "text_image" },
    });
    fireEvent.change(screen.getByLabelText("Text Content *"), {
      target: { value: "Partial upload test" },
    });

    const fileOk1 = new File(["ok1"], "ok1.jpg", { type: "image/jpeg" });
    const fileFail = new File(["fail"], "fail.jpg", { type: "image/jpeg" });
    const fileOk2 = new File(["ok2"], "ok2.jpg", { type: "image/jpeg" });

    const fileInput = screen.getByLabelText("Upload Image File");
    fireEvent.change(fileInput, {
      target: { files: [fileOk1, fileFail, fileOk2] },
    });

    // Verify successful uploads are shown as Uploaded
    await waitFor(() => {
      expect(screen.getAllByText("Uploaded")).toHaveLength(2);
      expect(screen.getByText(/Upload failed/)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Retry fail.jpg" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Create Block" }),
      ).toBeDisabled();
    });
  });

  it("4. retries only failed upload and preserves already-uploaded media without re-uploading, then submits full media_ids", async () => {
    let capturedPayload: CreateContentBlockRequest | null = null;
    const uploadCounts: Record<string, number> = {
      "ok1.jpg": 0,
      "fail_then_ok.jpg": 0,
    };
    let shouldFail = true;

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({ data: [] });
      }),
      http.post(
        `${env.apiBaseUrl}/api/v1/admin/media/upload`,
        async ({ request }) => {
          const form = await request.formData();
          const file = form.get("file") as File;
          uploadCounts[file.name] = (uploadCounts[file.name] || 0) + 1;

          if (file.name === "fail_then_ok.jpg" && shouldFail) {
            return HttpResponse.json(
              { error: { message: "Server connection glitch" } },
              { status: 500 },
            );
          }

          const id = file.name === "ok1.jpg" ? MEDIA_IDS.imgA : MEDIA_IDS.imgB;

          return HttpResponse.json({
            data: {
              type: "image",
              id,
              url: `http://localhost:8000/media/${file.name}`,
              original_filename: file.name,
              mime_type: "image/jpeg",
              file_size: 5000,
              created_at: "2026-01-01T00:00:00Z",
            },
          });
        },
      ),
      http.post(
        `${env.apiBaseUrl}/api/v1/admin/content-blocks`,
        async ({ request }) => {
          capturedPayload = (await request.json()) as CreateContentBlockRequest;
          return HttpResponse.json({
            data: {
              ...mockInitialBlock,
              ...capturedPayload,
              id: "recovered-block-id",
            },
          });
        },
      ),
    );

    renderAdminContent();
    await screen.findByRole("heading", { name: "Content Management" });

    fireEvent.click(
      await screen.findByRole("button", { name: "Create content block" }),
    );
    await screen.findByRole("heading", { name: "Create Content Block" });

    fireEvent.change(screen.getByLabelText("Block Type"), {
      target: { value: "text_image" },
    });
    fireEvent.change(screen.getByLabelText("Text Content *"), {
      target: { value: "Retry flow test" },
    });

    const fileOk = new File(["ok"], "ok1.jpg", { type: "image/jpeg" });
    const fileFlaky = new File(["flaky"], "fail_then_ok.jpg", {
      type: "image/jpeg",
    });

    const fileInput = screen.getByLabelText("Upload Image File");
    fireEvent.change(fileInput, { target: { files: [fileOk, fileFlaky] } });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Retry fail_then_ok.jpg" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Create Block" }),
      ).toBeDisabled();
    });

    expect(uploadCounts["ok1.jpg"]).toBe(1);
    expect(uploadCounts["fail_then_ok.jpg"]).toBe(1);

    // Turn off failure and click Retry
    shouldFail = false;
    fireEvent.click(
      screen.getByRole("button", { name: "Retry fail_then_ok.jpg" }),
    );

    // After retry succeeds, verify ok1.jpg was NOT re-uploaded
    await waitFor(() => {
      expect(screen.getAllByText("Uploaded")).toHaveLength(2);
      expect(
        screen.getByRole("button", { name: "Create Block" }),
      ).toBeEnabled();
    });

    expect(uploadCounts["ok1.jpg"]).toBe(1); // STILL 1! Preserved!
    expect(uploadCounts["fail_then_ok.jpg"]).toBe(2); // Retried once

    fireEvent.click(screen.getByRole("button", { name: "Create Block" }));

    await waitFor(() => {
      expect(capturedPayload?.media_ids).toEqual([
        MEDIA_IDS.imgA,
        MEDIA_IDS.imgB,
      ]);
    });
  });

  it("5. removes failed upload item, which re-enables Create Block and submits only successful media_ids", async () => {
    let capturedPayload: CreateContentBlockRequest | null = null;

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({ data: [] });
      }),
      http.post(
        `${env.apiBaseUrl}/api/v1/admin/media/upload`,
        async ({ request }) => {
          const form = await request.formData();
          const file = form.get("file") as File;

          if (file.name === "broken.jpg") {
            return HttpResponse.json(
              { error: { message: "Broken file" } },
              { status: 500 },
            );
          }

          return HttpResponse.json({
            data: {
              type: "image",
              id: MEDIA_IDS.imgA,
              url: "http://localhost:8000/media/good.jpg",
              original_filename: "good.jpg",
              mime_type: "image/jpeg",
              file_size: 5000,
              created_at: "2026-01-01T00:00:00Z",
            },
          });
        },
      ),
      http.post(
        `${env.apiBaseUrl}/api/v1/admin/content-blocks`,
        async ({ request }) => {
          capturedPayload = (await request.json()) as CreateContentBlockRequest;
          return HttpResponse.json({
            data: {
              ...mockInitialBlock,
              ...capturedPayload,
              id: "cleaned-block-id",
            },
          });
        },
      ),
    );

    renderAdminContent();
    await screen.findByRole("heading", { name: "Content Management" });

    fireEvent.click(
      await screen.findByRole("button", { name: "Create content block" }),
    );
    await screen.findByRole("heading", { name: "Create Content Block" });

    fireEvent.change(screen.getByLabelText("Block Type"), {
      target: { value: "text_image" },
    });
    fireEvent.change(screen.getByLabelText("Text Content *"), {
      target: { value: "Remove failed test" },
    });

    const fileGood = new File(["good"], "good.jpg", { type: "image/jpeg" });
    const fileBroken = new File(["bad"], "broken.jpg", { type: "image/jpeg" });

    const fileInput = screen.getByLabelText("Upload Image File");
    fireEvent.change(fileInput, { target: { files: [fileGood, fileBroken] } });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Remove broken.jpg" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Create Block" }),
      ).toBeDisabled();
    });

    // Remove the broken file
    fireEvent.click(screen.getByRole("button", { name: "Remove broken.jpg" }));

    // Create Block must now be enabled
    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Remove broken.jpg" }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Create Block" }),
      ).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Block" }));

    await waitFor(() => {
      expect(capturedPayload?.media_ids).toEqual([MEDIA_IDS.imgA]);
    });
  });

  it("6. edits existing single-image block and submits canonical media_ids without legacy media_id", async () => {
    let capturedPatchPayload: UpdateContentBlockRequest | null = null;

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({ data: [mockInitialBlock] });
      }),
      http.post(`${env.apiBaseUrl}/api/v1/admin/media/upload`, () => {
        return HttpResponse.json({
          data: {
            type: "image",
            id: MEDIA_IDS.imgB,
            url: "http://localhost:8000/media/replacement.jpg",
            original_filename: "replacement.jpg",
            mime_type: "image/jpeg",
            file_size: 4000,
            created_at: "2026-01-01T00:00:00Z",
          },
        });
      }),
      http.patch(
        `${env.apiBaseUrl}/api/v1/admin/content-blocks/${mockInitialBlock.id}`,
        async ({ request }) => {
          capturedPatchPayload =
            (await request.json()) as UpdateContentBlockRequest;
          return HttpResponse.json({
            data: {
              ...mockInitialBlock,
              ...capturedPatchPayload,
            },
          });
        },
      ),
    );

    renderAdminContent();
    await screen.findByText("Solo Performance");

    fireEvent.click(
      screen.getByRole("button", {
        name: `Edit block ${mockInitialBlock.title}`,
      }),
    );
    await screen.findByRole("heading", { name: "Edit Content Block" });

    // Add a second image
    const fileInput = screen.getByLabelText("Attach Additional Images");
    const newFile = new File(["bytes"], "replacement.jpg", {
      type: "image/jpeg",
    });
    fireEvent.change(fileInput, { target: { files: [newFile] } });

    await waitFor(() => {
      expect(screen.getByText("replacement.jpg")).toBeInTheDocument();
    });

    // Remove original image
    fireEvent.click(screen.getByRole("button", { name: "Remove paris_1.jpg" }));

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(capturedPatchPayload).toEqual({
        title: "Solo Performance",
        text: "Concert in Paris.",
        media_ids: [MEDIA_IDS.imgB],
      });
      expect(capturedPatchPayload).not.toHaveProperty("media_id");
    });
  });

  it("7. edits multi-image block with reordered images and submits reordered media_ids without legacy media_id", async () => {
    let capturedPatchPayload: UpdateContentBlockRequest | null = null;

    const multiImageBlock: AdminContentBlockDto = {
      ...mockInitialBlock,
      id: "b2222222-2222-4222-8222-222222222222",
      title: "Duet Tour",
      media: [
        {
          id: MEDIA_IDS.imgA,
          media_type: "image",
          storage_provider: "local",
          original_filename: "first.jpg",
          stored_filename: "first.jpg",
          mime_type: "image/jpeg",
          file_size: 1000,
        },
        {
          id: MEDIA_IDS.imgB,
          media_type: "image",
          storage_provider: "local",
          original_filename: "second.jpg",
          stored_filename: "second.jpg",
          mime_type: "image/jpeg",
          file_size: 1000,
        },
      ],
    };

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({ data: [multiImageBlock] });
      }),
      http.patch(
        `${env.apiBaseUrl}/api/v1/admin/content-blocks/${multiImageBlock.id}`,
        async ({ request }) => {
          capturedPatchPayload =
            (await request.json()) as UpdateContentBlockRequest;
          return HttpResponse.json({
            data: {
              ...multiImageBlock,
              ...capturedPatchPayload,
            },
          });
        },
      ),
    );

    renderAdminContent();
    await screen.findByText("Duet Tour");

    fireEvent.click(
      screen.getByRole("button", {
        name: `Edit block ${multiImageBlock.title}`,
      }),
    );
    await screen.findByRole("heading", { name: "Edit Content Block" });

    // Move first image down
    fireEvent.click(
      screen.getByRole("button", { name: "Move first.jpg down" }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(capturedPatchPayload).toEqual({
        title: "Duet Tour",
        text: "Concert in Paris.",
        media_ids: [MEDIA_IDS.imgB, MEDIA_IDS.imgA],
      });
      expect(capturedPatchPayload).not.toHaveProperty("media_id");
    });
  });

  it("8. rejects invalid domain enum values via safeParse boundaries without state mutation", async () => {
    // Verify Zod runtime boundary schema validations
    expect(ContentBlockTypeSchema.safeParse("unknown_block").success).toBe(
      false,
    );
    expect(ContentBlockTypeSchema.safeParse("text").success).toBe(true);
    expect(ContentBlockTypeSchema.safeParse("text_image").success).toBe(true);

    expect(FontFamilySchema.safeParse("comic_sans").success).toBe(false);
    expect(FontFamilySchema.safeParse("sans").success).toBe(true);
    expect(FontFamilySchema.safeParse("display").success).toBe(true);

    expect(FontSizeSchema.safeParse("gigantic").success).toBe(false);
    expect(FontSizeSchema.safeParse("md").success).toBe(true);
    expect(FontSizeSchema.safeParse("2xl").success).toBe(true);

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({ data: [] });
      }),
    );

    renderAdminContent();
    await screen.findByRole("heading", { name: "Content Management" });

    fireEvent.click(
      await screen.findByRole("button", { name: "Create content block" }),
    );
    await screen.findByRole("heading", { name: "Create Content Block" });

    const typeSelect = screen.getByLabelText("Block Type") as HTMLSelectElement;
    expect(typeSelect.value).toBe("text");

    // Attempt to fire invalid change event
    fireEvent.change(typeSelect, { target: { value: "invalid_type" } });
    // State remains text because safeParse rejected it
    expect(typeSelect.value).toBe("text");

    const fontSelect = screen.getByLabelText(
      "Font Family",
    ) as HTMLSelectElement;
    expect(fontSelect.value).toBe("sans");

    // Attempt invalid font change
    fireEvent.change(fontSelect, { target: { value: "wingdings" } });
    // State remains sans because safeParse rejected it
    expect(fontSelect.value).toBe("sans");

    const sizeSelect = screen.getByLabelText("Font Size") as HTMLSelectElement;
    expect(sizeSelect.value).toBe("md");

    // Attempt invalid size change
    fireEvent.change(sizeSelect, { target: { value: "colossal" } });
    // State remains md because safeParse rejected it
    expect(sizeSelect.value).toBe("md");
  });

  it("9. removes last attached image from text_image block and sends canonical media_ids: [] with media_id absent", async () => {
    let capturedPatchPayload: UpdateContentBlockRequest | null = null;

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({ data: [mockInitialBlock] });
      }),
      http.patch(
        `${env.apiBaseUrl}/api/v1/admin/content-blocks/${mockInitialBlock.id}`,
        async ({ request }) => {
          capturedPatchPayload =
            (await request.json()) as UpdateContentBlockRequest;
          return HttpResponse.json({
            data: {
              ...mockInitialBlock,
              ...capturedPatchPayload,
            },
          });
        },
      ),
    );

    renderAdminContent();
    await screen.findByText("Solo Performance");

    fireEvent.click(
      screen.getByRole("button", {
        name: `Edit block ${mockInitialBlock.title}`,
      }),
    );
    await screen.findByRole("heading", { name: "Edit Content Block" });

    // Remove the only attached image (paris_1.jpg)
    fireEvent.click(screen.getByRole("button", { name: "Remove paris_1.jpg" }));

    await waitFor(() => {
      expect(screen.queryByText("paris_1.jpg")).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(capturedPatchPayload).toEqual({
        title: "Solo Performance",
        text: "Concert in Paris.",
        media_ids: [],
      });
      expect(capturedPatchPayload).not.toHaveProperty("media_id");
    });
  });

  it("10. saves existing text_image block unchanged with media_ids: ['A'] and media_id absent", async () => {
    let capturedPatchPayload: UpdateContentBlockRequest | null = null;

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({ data: [mockInitialBlock] });
      }),
      http.patch(
        `${env.apiBaseUrl}/api/v1/admin/content-blocks/${mockInitialBlock.id}`,
        async ({ request }) => {
          capturedPatchPayload =
            (await request.json()) as UpdateContentBlockRequest;
          return HttpResponse.json({
            data: {
              ...mockInitialBlock,
              ...capturedPatchPayload,
            },
          });
        },
      ),
    );

    renderAdminContent();
    await screen.findByText("Solo Performance");

    fireEvent.click(
      screen.getByRole("button", {
        name: `Edit block ${mockInitialBlock.title}`,
      }),
    );
    await screen.findByRole("heading", { name: "Edit Content Block" });

    // Save directly without changing anything
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(capturedPatchPayload).toEqual({
        title: "Solo Performance",
        text: "Concert in Paris.",
        media_ids: [MEDIA_IDS.imgA],
      });
      expect(capturedPatchPayload).not.toHaveProperty("media_id");
    });
  });
});
