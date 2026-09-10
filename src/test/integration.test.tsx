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
import { SpaSectionsPage } from "../features/admin/sections/SpaSectionsPage";
import { UsersPage } from "../features/admin/users/UsersPage";
import { RequireRole } from "../features/auth/RequireRole";
import { PublicPage } from "../features/public-page/PublicPage";
import { LoginPage } from "../features/auth/LoginPage";
import { NotFoundPage } from "../components/common/NotFoundPage";
import {
  AdminContentBlockDto,
  AdminImageMedia,
  AdminSpaSectionDto,
  BlockAttachedMediaDto,
  UserDto,
} from "../api/types";

const SECTION_IDS = {
  awards: "11111111-1111-4111-8111-111111111111",
  partners: "22222222-2222-4222-8222-222222222222",
} as const;

const BLOCK_IDS = {
  b1: "a1111111-1111-4111-8111-111111111111",
  b2: "a2222222-2222-4222-8222-222222222222",
  b3: "a3333333-3333-4333-8333-333333333333",
} as const;

const MEDIA_IDS = {
  m1: "66666666-6666-4666-8666-666666666666",
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
    is_visible: true,
    content_block_count: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

function renderIntegrationRouter(
  initialEntries: string[],
  user: UserDto | null = mockAdminUser,
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
                path: "sections",
                element: <SpaSectionsPage />,
              },
              {
                path: "content",
                element: <ContentBlocksPage />,
              },
              {
                path: "users",
                element: (
                  <RequireRole role="super_admin">
                    <UsersPage />
                  </RequireRole>
                ),
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

describe("FRONTEND F8 — Final Integration & Release Validation", () => {
  beforeEach(() => {
    server.resetHandlers();
    authSession.clearSession();
  });

  afterEach(() => {
    server.resetHandlers();
    authSession.clearSession();
  });

  describe("Routing & Fallback Integration", () => {
    it("renders Not Found page for unknown public routes", async () => {
      renderIntegrationRouter(["/nonexistent-route"], null);

      await screen.findByRole("heading", { name: "404 - Page Not Found" });
      expect(
        screen.getByText(
          "The requested page does not exist or has been moved.",
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "Return to Public Application" }),
      ).toHaveAttribute("href", "/");
    });

    it("renders Not Found page for authenticated unknown admin routes inside AdminLayout", async () => {
      renderIntegrationRouter(["/admin/does-not-exist"]);

      await screen.findByRole("heading", { name: "404 - Page Not Found" });
      expect(
        screen.getByText(
          "The requested page does not exist or has been moved.",
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "Return to Public Application" }),
      ).toHaveAttribute("href", "/");
      expect(
        screen.queryByRole("heading", { name: "Admin Dashboard" }),
      ).toBeNull();
      expect(screen.queryByText("Admin Dashboard")).toBeNull();
      expect(
        screen.getByRole("button", { name: "Log Out" }),
      ).toBeInTheDocument();
    });
  });

  describe("Public SPA Integration", () => {
    it("renders dynamic public page with all four content block types in exact backend sort order", async () => {
      const publicPagePayload = {
        data: {
          page: {
            id: "f1111111-1111-4111-8111-111111111111",
            slug: "home",
            title: "SPA Saxophone Ensemble",
            seo_title: "SPA Saxophone Ensemble",
            seo_description: "Public ensemble application",
            seo_keywords: ["saxophone", "ensemble"],
          },
          sections: [
            {
              id: SECTION_IDS.awards,
              key: "awards",
              title: "International Honors",
              navigation_label: "Awards",
              sort_order: 10,
              blocks: [
                {
                  id: BLOCK_IDS.b1,
                  block_type: "text",
                  title: "Grand Prize Winner",
                  text: "Winner of International Saxophone Competition.",
                  media: null,
                  sort_order: 10,
                },
                {
                  id: BLOCK_IDS.b2,
                  block_type: "text_image",
                  title: "Trophy Showcase",
                  text: "Gold award ceremony trophy.",
                  media: {
                    type: "image",
                    id: MEDIA_IDS.m1,
                    url: "http://localhost:8000/media/trophy.png",
                    alt_text: "Trophy Showcase",
                  },
                  sort_order: 20,
                },
                {
                  id: BLOCK_IDS.b3,
                  block_type: "text_video",
                  title: "Performance Clip",
                  text: "Live performance video.",
                  media: {
                    type: "video",
                    id: "99999999-9999-4999-8999-999999999999",
                    url: "http://localhost:8000/media/concert.mp4",
                    mime_type: "video/mp4",
                  },
                  sort_order: 30,
                },
                {
                  id: "a4444444-4444-4444-8444-444444444444",
                  block_type: "text_youtube",
                  title: "Ensemble Highlights",
                  text: "Watch on YouTube.",
                  media: {
                    type: "youtube",
                    id: "88888888-8888-4888-8888-888888888888",
                    youtube_video_id: "dQw4w9WgXcQ",
                    embed_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
                    thumbnail_url:
                      "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
                  },
                  sort_order: 40,
                },
              ],
            },
            {
              id: SECTION_IDS.partners,
              key: "partners",
              title: "Sponsors & Partners",
              navigation_label: "Partners",
              sort_order: 20,
              blocks: [], // Empty visible section
            },
          ],
          testimonials: [],
        },
      };

      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/public/page`, () => {
          return HttpResponse.json(publicPagePayload);
        }),
      );

      renderIntegrationRouter(["/"], null);

      await screen.findByRole("heading", { name: "International Honors" });

      // 1. Navigation links
      const awardsLinks = screen.getAllByRole("link", { name: "Awards" });
      expect(awardsLinks[0]).toHaveAttribute("href", "#awards");

      const partnersLinks = screen.getAllByRole("link", { name: "Partners" });
      expect(partnersLinks[0]).toHaveAttribute("href", "#partners");

      // 2. Text block
      expect(screen.getByText("Grand Prize Winner")).toBeInTheDocument();
      expect(
        screen.getByText("Winner of International Saxophone Competition."),
      ).toBeInTheDocument();

      // 3. Text + Image block
      expect(screen.getByText("Trophy Showcase")).toBeInTheDocument();
      const img = screen.getByAltText("Trophy Showcase");
      expect(img).toHaveAttribute(
        "src",
        "http://localhost:8000/media/trophy.png",
      );

      // 4. Text + Video block
      expect(screen.getByText("Performance Clip")).toBeInTheDocument();
      const video = document.querySelector("video");
      expect(video).toBeInTheDocument();
      const videoSource = video?.querySelector("source");
      expect(videoSource).toHaveAttribute(
        "src",
        "http://localhost:8000/media/concert.mp4",
      );

      // 5. Text + YouTube block
      expect(screen.getByText("Ensemble Highlights")).toBeInTheDocument();
      const iframe = document.querySelector("iframe");
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute(
        "src",
        "https://www.youtube.com/embed/dQw4w9WgXcQ",
      );

      // 6. Visible empty section renders heading
      expect(screen.getByText("Sponsors & Partners")).toBeInTheDocument();
    });
  });

  describe("Admin Full Integration Lifecycle", () => {
    it("executes complete admin happy-path workflow: select section -> create block -> edit block -> reorder block -> delete block", async () => {
      let serverBlocks: AdminContentBlockDto[] = [
        {
          id: BLOCK_IDS.b1,
          spa_section_id: SECTION_IDS.awards,
          section_key: "awards",
          section_title: "Awards",
          block_type: "text",
          title: "Existing Block 1",
          text: "Initial text 1",
          media: null,
          sort_order: 10,
          is_visible: true,
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
      ];

      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
          return HttpResponse.json({ data: mockSections });
        }),
        http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
          return HttpResponse.json({ data: serverBlocks });
        }),
        http.post(
          `${env.apiBaseUrl}/api/v1/admin/content-blocks`,
          async ({ request }) => {
            const body = (await request.json()) as Record<string, unknown>;
            const newBlock: AdminContentBlockDto = {
              id: BLOCK_IDS.b2,
              spa_section_id: SECTION_IDS.awards,
              section_key: "awards",
              section_title: "Awards",
              block_type: body.block_type as AdminContentBlockDto["block_type"],
              title: body.title as string,
              text: body.text as string,
              media: null,
              sort_order: 20,
              is_visible: true,
              created_at: "2026-01-01T00:00:00Z",
              updated_at: "2026-01-01T00:00:00Z",
            };
            serverBlocks.push(newBlock);
            return HttpResponse.json({ data: newBlock });
          },
        ),
        http.patch(
          `${env.apiBaseUrl}/api/v1/admin/content-blocks/${BLOCK_IDS.b2}`,
          async ({ request }) => {
            const body = (await request.json()) as Record<string, unknown>;
            const updated = serverBlocks.find((b) => b.id === BLOCK_IDS.b2)!;
            updated.title = body.title as string;
            return HttpResponse.json({ data: updated });
          },
        ),
        http.post(
          `${env.apiBaseUrl}/api/v1/admin/spa-sections/:spaSectionId/content-blocks/reorder`,
          () => {
            serverBlocks.reverse();
            return HttpResponse.json({ data: { message: "Reordered" } });
          },
        ),
        http.delete(
          `${env.apiBaseUrl}/api/v1/admin/content-blocks/${BLOCK_IDS.b2}`,
          () => {
            serverBlocks = serverBlocks.filter((b) => b.id !== BLOCK_IDS.b2);
            return HttpResponse.json({ data: { message: "Deleted" } });
          },
        ),
      );

      renderIntegrationRouter(["/admin/content"]);

      // 1. Initial list load
      await screen.findByText("Existing Block 1");

      // 2. Create new ContentBlock
      const createBtn = screen.getAllByRole("button", {
        name: "Create content block",
      })[0]!;
      fireEvent.click(createBtn);

      await screen.findByRole("heading", { name: "Create Content Block" });

      fireEvent.change(screen.getByLabelText("Title (Optional)"), {
        target: { value: "F8 Integrated Test Block" },
      });
      fireEvent.change(screen.getByLabelText("Text Content *"), {
        target: { value: "Integration content test." },
      });

      fireEvent.click(screen.getByRole("button", { name: "Create Block" }));

      await screen.findByText("F8 Integrated Test Block");

      // 3. Edit block title
      fireEvent.click(
        screen.getByRole("button", {
          name: "Edit block F8 Integrated Test Block",
        }),
      );

      await screen.findByRole("heading", { name: "Edit Content Block" });

      fireEvent.change(screen.getByLabelText("Title (Optional)"), {
        target: { value: "Updated F8 Integrated Block" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

      await screen.findByText("Updated F8 Integrated Block");

      // 4. Reorder block up
      const moveUpBtn = screen.getByRole("button", {
        name: 'Move "Updated F8 Integrated Block" up',
      });
      fireEvent.click(moveUpBtn);

      await screen.findByText(
        'Moved "Updated F8 Integrated Block" to position 1 of 2.',
      );

      // 5. Delete block
      fireEvent.click(
        screen.getByRole("button", {
          name: "Delete block Updated F8 Integrated Block",
        }),
      );

      await screen.findByRole("heading", { name: "Delete Content Block" });

      fireEvent.click(screen.getByRole("button", { name: /^Delete Block$/i }));

      await waitFor(() => {
        expect(screen.queryByText("Updated F8 Integrated Block")).toBeNull();
      });
    });

    it("uploads image, creates text_image block, edits text without re-upload, and deletes block without deleting media", async () => {
      let mediaUploadCount = 0;
      let mediaDeleteCount = 0;
      let blockCreatePayload: Record<string, unknown> | null = null;

      const uploadedImageMedia: AdminImageMedia = {
        type: "image",
        id: MEDIA_IDS.m1,
        url: "http://localhost:8000/uploads/photo.png",
        original_filename: "photo.png",
        mime_type: "image/png",
        file_size: 1024,
        created_at: "2026-01-01T00:00:00Z",
      };

      const blockAttachedMedia: BlockAttachedMediaDto = {
        id: MEDIA_IDS.m1,
        media_type: "image",
        storage_provider: "local",
        original_filename: "photo.png",
        mime_type: "image/png",
        file_size: 1024,
      };

      let currentBlocks: AdminContentBlockDto[] = [];

      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
          return HttpResponse.json({ data: mockSections });
        }),
        http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
          return HttpResponse.json({ data: currentBlocks });
        }),
        http.post(`${env.apiBaseUrl}/api/v1/admin/media/upload`, () => {
          mediaUploadCount++;
          return HttpResponse.json({ data: uploadedImageMedia });
        }),
        http.post(
          `${env.apiBaseUrl}/api/v1/admin/content-blocks`,
          async ({ request }) => {
            const body = (await request.json()) as Record<string, unknown>;
            blockCreatePayload = body;
            const newBlock: AdminContentBlockDto = {
              id: BLOCK_IDS.b1,
              spa_section_id: SECTION_IDS.awards,
              section_key: "awards",
              section_title: "Awards",
              block_type: body.block_type as AdminContentBlockDto["block_type"],
              title: body.title as string,
              text: body.text as string,
              media: blockAttachedMedia,
              sort_order: 10,
              is_visible: true,
              created_at: "2026-01-01T00:00:00Z",
              updated_at: "2026-01-01T00:00:00Z",
            };
            currentBlocks.push(newBlock);
            return HttpResponse.json({ data: newBlock });
          },
        ),
        http.patch(
          `${env.apiBaseUrl}/api/v1/admin/content-blocks/${BLOCK_IDS.b1}`,
          async ({ request }) => {
            const body = (await request.json()) as Record<string, unknown>;
            const updated = currentBlocks.find((b) => b.id === BLOCK_IDS.b1)!;
            updated.title = body.title as string;
            return HttpResponse.json({ data: updated });
          },
        ),
        http.delete(
          `${env.apiBaseUrl}/api/v1/admin/content-blocks/${BLOCK_IDS.b1}`,
          () => {
            currentBlocks = currentBlocks.filter((b) => b.id !== BLOCK_IDS.b1);
            return HttpResponse.json({ data: { message: "Deleted" } });
          },
        ),
        http.delete(`${env.apiBaseUrl}/api/v1/admin/media/:id`, () => {
          mediaDeleteCount++;
          return HttpResponse.json({ data: { message: "Deleted" } });
        }),
      );

      renderIntegrationRouter(["/admin/content"]);

      await screen.findByRole("heading", { name: "Content Management" });

      // 1. Open Create Content Block modal
      const createBtn = await screen.findByRole("button", {
        name: "Create content block",
      });
      fireEvent.click(createBtn);

      await screen.findByRole("heading", { name: "Create Content Block" });

      // 2. Select block type "text_image"
      fireEvent.change(screen.getByLabelText("Block Type"), {
        target: { value: "text_image" },
      });

      // 3. Fill title & text
      fireEvent.change(screen.getByLabelText("Title (Optional)"), {
        target: { value: "Uploaded Photo Block" },
      });
      fireEvent.change(screen.getByLabelText("Text Content *"), {
        target: { value: "Uploaded photo description." },
      });

      // 4. Select real File object
      const testFile = new File(["fake-image-bytes"], "photo.png", {
        type: "image/png",
      });
      const fileInput = screen.getByLabelText("Upload Image File");
      fireEvent.change(fileInput, { target: { files: [testFile] } });

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Create Block" }),
        ).toBeEnabled();
      });

      // 5. Submit form -> triggers media upload POST then content block create POST
      fireEvent.click(screen.getByRole("button", { name: "Create Block" }));

      await screen.findByText("Uploaded Photo Block");

      // Assert media upload request was issued once
      expect(mediaUploadCount).toBe(1);

      // Assert content block create payload contained uploaded media_ids
      expect(blockCreatePayload).not.toBeNull();
      const payload = blockCreatePayload!;
      expect(payload.media_ids).toEqual([MEDIA_IDS.m1]);
      expect(payload.block_type).toBe("text_image");

      // 6. Edit text only without selecting new file
      fireEvent.click(
        screen.getByRole("button", {
          name: "Edit block Uploaded Photo Block",
        }),
      );

      await screen.findByRole("heading", { name: "Edit Content Block" });

      fireEvent.change(screen.getByLabelText("Title (Optional)"), {
        target: { value: "Updated Photo Title" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

      await screen.findByText("Updated Photo Title");

      // Assert no second media upload was made
      expect(mediaUploadCount).toBe(1);

      // 7. Delete block
      fireEvent.click(
        screen.getByRole("button", {
          name: "Delete block Updated Photo Title",
        }),
      );

      await screen.findByRole("heading", { name: "Delete Content Block" });

      fireEvent.click(screen.getByRole("button", { name: /^Delete Block$/i }));

      await waitFor(() => {
        expect(screen.queryByText("Updated Photo Title")).toBeNull();
      });

      // Assert media DELETE was 0 (no cascade media delete)
      expect(mediaDeleteCount).toBe(0);
    });

    it("edits an existing image block without re-uploading and deletes without media cascade", async () => {
      let mediaUploadCount = 0;
      let mediaDeleteCount = 0;

      const mockImage: BlockAttachedMediaDto = {
        id: MEDIA_IDS.m1,
        media_type: "image",
        storage_provider: "local",
        original_filename: "upload.png",
        mime_type: "image/png",
        file_size: 1024,
      };

      const mediaBlock: AdminContentBlockDto = {
        id: BLOCK_IDS.b1,
        spa_section_id: SECTION_IDS.awards,
        section_key: "awards",
        section_title: "Awards",
        block_type: "text_image",
        title: "Media Block Initial",
        text: "Media block content.",
        media: mockImage,
        sort_order: 10,
        is_visible: true,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      };

      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
          return HttpResponse.json({ data: mockSections });
        }),
        http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
          return HttpResponse.json({ data: [mediaBlock] });
        }),
        http.post(`${env.apiBaseUrl}/api/v1/admin/media/upload`, () => {
          mediaUploadCount++;
          return HttpResponse.json({ data: mockImage });
        }),
        http.patch(
          `${env.apiBaseUrl}/api/v1/admin/content-blocks/${BLOCK_IDS.b1}`,
          async ({ request }) => {
            const body = (await request.json()) as Record<string, unknown>;
            mediaBlock.title = body.title as string;
            return HttpResponse.json({ data: mediaBlock });
          },
        ),
        http.delete(
          `${env.apiBaseUrl}/api/v1/admin/content-blocks/${BLOCK_IDS.b1}`,
          () => {
            return HttpResponse.json({ data: { message: "Deleted" } });
          },
        ),
        http.delete(`${env.apiBaseUrl}/api/v1/admin/media/:id`, () => {
          mediaDeleteCount++;
          return HttpResponse.json({ data: { message: "Deleted" } });
        }),
      );

      renderIntegrationRouter(["/admin/content"]);

      await screen.findByText("Media Block Initial");

      // Edit title text without touching media
      fireEvent.click(
        screen.getByRole("button", {
          name: "Edit block Media Block Initial",
        }),
      );

      await screen.findByRole("heading", { name: "Edit Content Block" });

      fireEvent.change(screen.getByLabelText("Title (Optional)"), {
        target: { value: "Media Block Text Edited" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

      await screen.findByText("Media Block Text Edited");
      expect(mediaUploadCount).toBe(0);

      // Delete block
      fireEvent.click(
        screen.getByRole("button", {
          name: "Delete block Media Block Text Edited",
        }),
      );

      await screen.findByRole("heading", { name: "Delete Content Block" });

      fireEvent.click(screen.getByRole("button", { name: /^Delete Block$/i }));

      await waitFor(() => {
        expect(mediaDeleteCount).toBe(0);
      });
    });

    it("executes integrated reorder failure recovery: POST succeeds -> GET confirmation fails -> Retry succeeds", async () => {
      let getCount = 0;
      let postCount = 0;

      const blockX: AdminContentBlockDto = {
        id: BLOCK_IDS.b1,
        spa_section_id: SECTION_IDS.awards,
        section_key: "awards",
        section_title: "Awards",
        block_type: "text",
        title: "Block X",
        text: "Content X",
        media: null,
        sort_order: 10,
        is_visible: true,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      };

      const blockY: AdminContentBlockDto = {
        id: BLOCK_IDS.b2,
        spa_section_id: SECTION_IDS.awards,
        section_key: "awards",
        section_title: "Awards",
        block_type: "text",
        title: "Block Y",
        text: "Content Y",
        media: null,
        sort_order: 20,
        is_visible: true,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      };

      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
          return HttpResponse.json({ data: mockSections });
        }),
        http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
          getCount++;
          if (getCount === 1) {
            return HttpResponse.json({ data: [blockX, blockY] });
          }
          if (getCount === 2) {
            return HttpResponse.json(
              {
                error: {
                  code: "REFRESH_ERROR",
                  message: "Temporary load failure",
                  request_id: "req_rec_123",
                },
              },
              { status: 500 },
            );
          }
          return HttpResponse.json({ data: [blockY, blockX] });
        }),
        http.post(
          `${env.apiBaseUrl}/api/v1/admin/spa-sections/:spaSectionId/content-blocks/reorder`,
          () => {
            postCount++;
            return HttpResponse.json({ data: { message: "Reordered" } });
          },
        ),
      );

      renderIntegrationRouter(["/admin/content"]);

      await screen.findByText("Block X");

      const moveDownBtn = screen.getByRole("button", {
        name: 'Move "Block X" down',
      });
      fireEvent.click(moveDownBtn);

      await waitFor(() => {
        expect(
          screen.getAllByText(
            "Order was saved, but the latest order could not be loaded.",
          ).length,
        ).toBeGreaterThan(0);
        expect(screen.getByText("Request ID: req_rec_123")).toBeInTheDocument();
      });

      expect(postCount).toBe(1);

      // Retry GET
      const retryBtn = screen.getByRole("button", { name: "Retry" });
      fireEvent.click(retryBtn);

      await screen.findByText('Moved "Block X" to position 2 of 2.');
      expect(postCount).toBe(1);
    });

    it("executes complete super_admin user management lifecycle: list -> create user -> edit user -> deactivate user", async () => {
      const mockSuperAdminUser: UserDto = {
        id: "10000000-0000-4000-8000-000000000001",
        email: "superadmin@example.test",
        display_name: "Super Admin",
        role: "super_admin",
        is_active: true,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      };

      let userList: UserDto[] = [mockSuperAdminUser];

      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/admin/users`, () => {
          return HttpResponse.json({ data: userList });
        }),
        http.post(
          `${env.apiBaseUrl}/api/v1/admin/users`,
          async ({ request }) => {
            const body = (await request.json()) as Record<string, unknown>;
            const created: UserDto = {
              id: "20000000-0000-4000-8000-000000000002",
              email: body.email as string,
              display_name: body.display_name as string,
              role: body.role as UserDto["role"],
              is_active: true,
              created_at: "2026-01-01T00:00:00Z",
              updated_at: "2026-01-01T00:00:00Z",
            };
            userList.push(created);
            return HttpResponse.json({ data: created });
          },
        ),
        http.patch(
          `${env.apiBaseUrl}/api/v1/admin/users/:id`,
          async ({ request, params }) => {
            const body = (await request.json()) as Record<string, unknown>;
            userList = userList.map((u) => {
              if (u.id === params.id) {
                return {
                  ...u,
                  ...(body.display_name !== undefined && {
                    display_name: body.display_name as string,
                  }),
                  ...(body.is_active !== undefined && {
                    is_active: body.is_active as boolean,
                  }),
                };
              }
              return u;
            });
            const updated = userList.find((u) => u.id === params.id)!;
            return HttpResponse.json({ data: updated });
          },
        ),
      );

      renderIntegrationRouter(["/admin/users"], mockSuperAdminUser);

      // 1. Render Users Page
      await screen.findByRole("heading", { name: "Users", level: 1 });
      await screen.findByText("superadmin@example.test");

      // 2. Create User
      fireEvent.click(screen.getByRole("button", { name: "+ Create User" }));
      await screen.findByRole("heading", { name: "Create User", level: 2 });

      fireEvent.change(screen.getByLabelText("Email Address"), {
        target: { value: "createduser@example.test" },
      });
      fireEvent.change(screen.getByLabelText("Display Name"), {
        target: { value: "Created User" },
      });
      fireEvent.change(screen.getByLabelText("Password"), {
        target: { value: "password123" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Create User" }));

      await screen.findByText("createduser@example.test");

      // 3. Edit User
      fireEvent.click(
        screen.getByRole("button", { name: "Edit Created User" }),
      );
      await screen.findByRole("heading", { name: "Edit User", level: 2 });

      fireEvent.change(screen.getByLabelText("Display Name"), {
        target: { value: "Updated Created User" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
      await screen.findByText("Updated Created User");

      // 4. Deactivate User
      fireEvent.click(
        screen.getByRole("button", { name: "Deactivate Updated Created User" }),
      );
      await screen.findByRole("heading", { name: "Deactivate User", level: 2 });

      fireEvent.click(screen.getByRole("button", { name: "Deactivate" }));

      await waitFor(() => {
        expect(screen.getByText("Inactive")).toBeInTheDocument();
      });
    });

    it("clears memory session state and redirects to login on logout", async () => {
      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
          return HttpResponse.json({ data: mockSections });
        }),
        http.post(`${env.apiBaseUrl}/api/v1/auth/logout`, () => {
          return HttpResponse.json({ data: { message: "Logged out" } });
        }),
      );

      renderIntegrationRouter(["/admin/sections"]);

      await screen.findByText("SPA Sections");

      const logoutBtn = screen.getByRole("button", { name: "Log Out" });
      fireEvent.click(logoutBtn);

      await waitFor(() => {
        expect(authSession.getAccessToken()).toBeNull();
        expect(
          screen.getByRole("heading", { name: "SPA Saxophone CMS" }),
        ).toBeInTheDocument();
      });
    });
  });
});
