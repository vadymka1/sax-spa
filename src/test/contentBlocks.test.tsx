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
import { buildReorderItems } from "../features/admin/content/reorderHelper";
import { LoginPage } from "../features/auth/LoginPage";
import {
  AdminContentBlockDto,
  AdminMediaDto,
  AdminSpaSectionDto,
  CreateContentBlockRequest,
  CreateYoutubeMediaRequest,
  ReorderContentBlocksRequest,
  UpdateContentBlockRequest,
  UserDto,
} from "../api/types";

const SECTION_IDS = {
  awards: "11111111-1111-4111-8111-111111111111",
  partners: "22222222-2222-4222-8222-222222222222",
  festival: "33333333-3333-4333-8333-333333333333",
} as const;

const BLOCK_IDS = {
  b1: "a1111111-1111-4111-8111-111111111111",
  b2: "a2222222-2222-4222-8222-222222222222",
  b3: "a3333333-3333-4333-8333-333333333333",
  b4: "a4444444-4444-4444-8444-444444444444",
} as const;

const MEDIA_IDS = {
  m1: "66666666-6666-4666-8666-666666666666",
  m2: "77777777-7777-4777-8777-777777777777",
  m3: "88888888-8888-4888-8888-888888888888",
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

const mockSuperAdminUser: UserDto = {
  id: "10000000-0000-4000-8000-000000000002",
  email: "super@example.test",
  display_name: "Super Admin",
  role: "super_admin",
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
    content_block_count: 1,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: SECTION_IDS.festival,
    key: "festival",
    title: "Festival",
    navigation_label: "Festival 2027",
    sort_order: 3,
    is_visible: true,
    content_block_count: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

const mockImageMedia: AdminMediaDto = {
  type: "image",
  id: MEDIA_IDS.m1,
  url: "http://localhost:8000/media/image1.jpg",
  original_filename: "sax_photo.jpg",
  mime_type: "image/jpeg",
  file_size: 102400,
  alt_text: "Golden Saxophone",
  created_at: "2026-01-01T00:00:00Z",
};

const mockVideoMedia: AdminMediaDto = {
  type: "video",
  id: MEDIA_IDS.m2,
  url: "http://localhost:8000/media/video1.mp4",
  original_filename: "performance.mp4",
  mime_type: "video/mp4",
  file_size: 5242880,
  created_at: "2026-01-01T00:00:00Z",
};

const mockYoutubeMedia: AdminMediaDto = {
  type: "youtube",
  id: MEDIA_IDS.m3,
  youtube_video_id: "dQw4w9WgXcQ",
  youtube_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  embed_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  thumbnail_url: "https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg",
  title: "Live Concert",
  created_at: "2026-01-01T00:00:00Z",
};

const mockAwardsBlocks: AdminContentBlockDto[] = [
  {
    id: BLOCK_IDS.b1,
    spa_section_id: SECTION_IDS.awards,
    section_key: "awards",
    section_title: "Awards",
    block_type: "text",
    title: "First Prize Winner",
    text: "Awarded top saxophone honors in International Competition.",
    media: null,
    sort_order: 10,
    is_visible: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: BLOCK_IDS.b2,
    spa_section_id: SECTION_IDS.awards,
    section_key: "awards",
    section_title: "Awards",
    block_type: "text_image",
    title: "Gold Medal Ceremony",
    text: "Receiving the gold medal on stage.",
    media: {
      id: MEDIA_IDS.m1,
      media_type: "image",
      storage_provider: "local",
      original_filename: "sax_photo.jpg",
      mime_type: "image/jpeg",
      file_size: 102400,
    },
    sort_order: 20,
    is_visible: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

const mockPartnersBlocks: AdminContentBlockDto[] = [
  {
    id: BLOCK_IDS.b3,
    spa_section_id: SECTION_IDS.partners,
    section_key: "partners",
    section_title: "Partners",
    block_type: "text_video",
    title: "Sponsor Documentary",
    text: "Watch our main sponsor's documentary feature.",
    media: {
      id: MEDIA_IDS.m2,
      media_type: "video",
      storage_provider: "local",
      original_filename: "performance.mp4",
      mime_type: "video/mp4",
      file_size: 5242880,
    },
    sort_order: 1,
    is_visible: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

describe("FRONTEND F6 — Admin ContentBlock Management + Media", () => {
  beforeEach(() => {
    authSession.setTokens("mock-access-token", "mock-refresh-token");
    authSession.resetCheckedState();
  });

  afterEach(() => {
    authSession.clearSession();
    server.resetHandlers();
  });

  function renderTestRouter(
    initialEntries = ["/admin/content"],
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

    const testQueryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, retryDelay: 0 },
        mutations: { retry: false, retryDelay: 0 },
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
                  path: "content",
                  element: <ContentBlocksPage />,
                },
              ],
            },
          ],
        },
      ],
      { initialEntries },
    );

    return render(
      <QueryClientProvider client={testQueryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </QueryClientProvider>,
    );
  }

  it("redirects unauthenticated users from /admin/content to /admin/login", async () => {
    renderTestRouter(["/admin/content"], null);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Sign In to CMS" }),
      ).toBeInTheDocument();
    });
  });

  it("allows both admin and super_admin roles to access /admin/content", async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({ data: mockAwardsBlocks });
      }),
    );

    renderTestRouter(["/admin/content"], mockSuperAdminUser);

    await screen.findByRole("heading", { name: "Content Management" });
    expect(screen.getByText("super_admin")).toBeInTheDocument();
  });

  it("loads sections dynamically and scope-fetches blocks for selected section", async () => {
    let capturedSectionIdParam: string | null = null;

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(
        `${env.apiBaseUrl}/api/v1/admin/content-blocks`,
        ({ request }) => {
          const url = new URL(request.url);
          capturedSectionIdParam = url.searchParams.get("spa_section_id");
          return HttpResponse.json({ data: mockAwardsBlocks });
        },
      ),
    );

    renderTestRouter(["/admin/content"]);

    await screen.findByRole("heading", { name: "Content Management" });

    await waitFor(() => {
      expect(capturedSectionIdParam).toBe(SECTION_IDS.awards);
      expect(screen.getByText("First Prize Winner")).toBeInTheDocument();
      expect(screen.getByText("Gold Medal Ceremony")).toBeInTheDocument();
    });
  });

  it("switches blocks cleanly when selecting another section from dropdown", async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(
        `${env.apiBaseUrl}/api/v1/admin/content-blocks`,
        ({ request }) => {
          const url = new URL(request.url);
          const secId = url.searchParams.get("spa_section_id");
          if (secId === SECTION_IDS.partners) {
            return HttpResponse.json({ data: mockPartnersBlocks });
          }
          return HttpResponse.json({ data: mockAwardsBlocks });
        },
      ),
    );

    renderTestRouter(["/admin/content"]);

    await screen.findByText("First Prize Winner");

    const select = screen.getByLabelText("Select Section:");
    fireEvent.change(select, { target: { value: SECTION_IDS.partners } });

    await screen.findByText("Sponsor Documentary");
    expect(screen.queryByText("First Prize Winner")).toBeNull();
  });

  it("renders empty section state and create button when section has 0 blocks", async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({ data: [] });
      }),
    );

    renderTestRouter(["/admin/content"]);

    await screen.findByText("No content blocks in this section yet.");
    const createBtn = screen.getAllByRole("button", {
      name: "Create content block",
    })[0];
    expect(createBtn).toBeInTheDocument();
  });

  it("creates a text-only ContentBlock submitting exact backend fields", async () => {
    let capturedPostPayload: CreateContentBlockRequest | null = null;

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({ data: mockAwardsBlocks });
      }),
      http.post(
        `${env.apiBaseUrl}/api/v1/admin/content-blocks`,
        async ({ request }) => {
          capturedPostPayload =
            (await request.json()) as CreateContentBlockRequest;
          return HttpResponse.json({
            data: {
              id: BLOCK_IDS.b4,
              spa_section_id: SECTION_IDS.awards,
              section_key: "awards",
              section_title: "Awards",
              block_type: "text",
              title: "New Announcement",
              text: "Exciting new festival schedule announced.",
              media: null,
              sort_order: 30,
              is_visible: true,
              created_at: "2026-01-01T00:00:00Z",
              updated_at: "2026-01-01T00:00:00Z",
            },
          });
        },
      ),
    );

    renderTestRouter(["/admin/content"]);

    await screen.findByText("First Prize Winner");

    const createBtn = screen.getAllByRole("button", {
      name: "Create content block",
    })[0]!;
    fireEvent.click(createBtn);

    await screen.findByRole("heading", { name: "Create Content Block" });

    fireEvent.change(screen.getByLabelText("Title (Optional)"), {
      target: { value: "New Announcement" },
    });
    fireEvent.change(screen.getByLabelText("Text Content *"), {
      target: { value: "Exciting new festival schedule announced." },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Block" }));

    await waitFor(() => {
      expect(capturedPostPayload).toEqual({
        spa_section_id: SECTION_IDS.awards,
        block_type: "text",
        title: "New Announcement",
        text: "Exciting new festival schedule announced.",
      });
    });
  });

  it("creates a text_image block using native FormData upload", async () => {
    let uploadCalled = false;
    let uploadedFileName = "";
    let capturedBlockPayload: CreateContentBlockRequest | null = null;

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({ data: mockAwardsBlocks });
      }),
      http.post(
        `${env.apiBaseUrl}/api/v1/admin/media/upload`,
        async ({ request }) => {
          uploadCalled = true;
          const formData = await request.formData();
          const file = formData.get("file") as File;
          uploadedFileName = file.name;

          return HttpResponse.json({ data: mockImageMedia });
        },
      ),
      http.post(
        `${env.apiBaseUrl}/api/v1/admin/content-blocks`,
        async ({ request }) => {
          capturedBlockPayload =
            (await request.json()) as CreateContentBlockRequest;
          return HttpResponse.json({
            data: {
              ...mockAwardsBlocks[1]!,
              id: BLOCK_IDS.b4,
            },
          });
        },
      ),
    );

    renderTestRouter(["/admin/content"]);

    await screen.findByText("First Prize Winner");

    const createBtn = screen.getAllByRole("button", {
      name: "Create content block",
    })[0]!;
    fireEvent.click(createBtn);

    await screen.findByRole("heading", { name: "Create Content Block" });

    fireEvent.change(screen.getByLabelText("Block Type"), {
      target: { value: "text_image" },
    });
    fireEvent.change(screen.getByLabelText("Text Content *"), {
      target: { value: "Image description text" },
    });

    const fileInput = screen.getByLabelText("Upload Image File");
    const testFile = new File(["fake-image-bytes"], "saxophone.jpg", {
      type: "image/jpeg",
    });
    fireEvent.change(fileInput, { target: { files: [testFile] } });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Create Block" }),
      ).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Block" }));

    await waitFor(() => {
      expect(uploadCalled).toBe(true);
      expect(uploadedFileName).toBe("saxophone.jpg");
      expect(capturedBlockPayload).toEqual({
        spa_section_id: SECTION_IDS.awards,
        block_type: "text_image",
        text: "Image description text",
        media_ids: [MEDIA_IDS.m1],
      });
    });
  });

  it("creates a text_video block using native FormData upload", async () => {
    let uploadCalled = false;
    let uploadedFileName = "";
    let capturedBlockPayload: CreateContentBlockRequest | null = null;

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({ data: mockAwardsBlocks });
      }),
      http.post(
        `${env.apiBaseUrl}/api/v1/admin/media/upload`,
        async ({ request }) => {
          uploadCalled = true;
          const formData = await request.formData();
          const file = formData.get("file") as File;
          uploadedFileName = file.name;

          return HttpResponse.json({ data: mockVideoMedia });
        },
      ),
      http.post(
        `${env.apiBaseUrl}/api/v1/admin/content-blocks`,
        async ({ request }) => {
          capturedBlockPayload =
            (await request.json()) as CreateContentBlockRequest;
          return HttpResponse.json({
            data: {
              ...mockAwardsBlocks[1]!,
              id: BLOCK_IDS.b4,
              block_type: "text_video",
            },
          });
        },
      ),
    );

    renderTestRouter(["/admin/content"]);

    await screen.findByText("First Prize Winner");

    const createBtn = screen.getAllByRole("button", {
      name: "Create content block",
    })[0]!;
    fireEvent.click(createBtn);

    await screen.findByRole("heading", { name: "Create Content Block" });

    fireEvent.change(screen.getByLabelText("Block Type"), {
      target: { value: "text_video" },
    });
    fireEvent.change(screen.getByLabelText("Text Content *"), {
      target: { value: "Video description text" },
    });

    const fileInput = screen.getByLabelText("Upload Video File");
    const testFile = new File(["fake-video-bytes"], "concert.mp4", {
      type: "video/mp4",
    });
    fireEvent.change(fileInput, { target: { files: [testFile] } });

    fireEvent.click(screen.getByRole("button", { name: "Create Block" }));

    await waitFor(() => {
      expect(uploadCalled).toBe(true);
      expect(uploadedFileName).toBe("concert.mp4");
      expect(capturedBlockPayload).toEqual({
        spa_section_id: SECTION_IDS.awards,
        block_type: "text_video",
        text: "Video description text",
        media_id: MEDIA_IDS.m2,
      });
    });
  });

  it("creates a text_youtube block calling backend YouTube media creation", async () => {
    let capturedYoutubePayload: CreateYoutubeMediaRequest | null = null;
    let capturedBlockPayload: CreateContentBlockRequest | null = null;

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({ data: mockAwardsBlocks });
      }),
      http.post(
        `${env.apiBaseUrl}/api/v1/admin/media/youtube`,
        async ({ request }) => {
          capturedYoutubePayload =
            (await request.json()) as CreateYoutubeMediaRequest;
          return HttpResponse.json({ data: mockYoutubeMedia });
        },
      ),
      http.post(
        `${env.apiBaseUrl}/api/v1/admin/content-blocks`,
        async ({ request }) => {
          capturedBlockPayload =
            (await request.json()) as CreateContentBlockRequest;
          return HttpResponse.json({
            data: {
              id: BLOCK_IDS.b4,
              spa_section_id: SECTION_IDS.awards,
              section_key: "awards",
              section_title: "Awards",
              block_type: "text_youtube",
              title: "Performance Video",
              text: "Watch the full concert on YouTube.",
              media: {
                id: MEDIA_IDS.m3,
                media_type: "youtube",
                storage_provider: "youtube",
                youtube_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                thumbnail_url: "https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg",
              },
              sort_order: 30,
              is_visible: true,
              created_at: "2026-01-01T00:00:00Z",
              updated_at: "2026-01-01T00:00:00Z",
            },
          });
        },
      ),
    );

    renderTestRouter(["/admin/content"]);

    await screen.findByText("First Prize Winner");

    const createBtn = screen.getAllByRole("button", {
      name: "Create content block",
    })[0]!;
    fireEvent.click(createBtn);

    await screen.findByRole("heading", { name: "Create Content Block" });

    fireEvent.change(screen.getByLabelText("Block Type"), {
      target: { value: "text_youtube" },
    });
    fireEvent.change(screen.getByLabelText("Text Content *"), {
      target: { value: "Watch the full concert on YouTube." },
    });
    fireEvent.change(screen.getByLabelText("YouTube Video URL or ID"), {
      target: { value: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Block" }));

    await waitFor(() => {
      expect(capturedYoutubePayload).toEqual({
        youtube_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      });
      expect(capturedBlockPayload).toEqual({
        spa_section_id: SECTION_IDS.awards,
        block_type: "text_youtube",
        text: "Watch the full concert on YouTube.",
        media_id: MEDIA_IDS.m3,
      });
    });
  });

  it("prevents block POST when media upload fails", async () => {
    let blockPostCount = 0;

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({ data: mockAwardsBlocks });
      }),
      http.post(`${env.apiBaseUrl}/api/v1/admin/media/upload`, () => {
        return HttpResponse.json(
          {
            error: {
              code: "INVALID_FILE_TYPE",
              message: "File type not allowed",
            },
          },
          { status: 400 },
        );
      }),
      http.post(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        blockPostCount++;
        return HttpResponse.json({ data: mockAwardsBlocks[0] });
      }),
    );

    renderTestRouter(["/admin/content"]);

    await screen.findByText("First Prize Winner");

    const createBtn = screen.getAllByRole("button", {
      name: "Create content block",
    })[0]!;
    fireEvent.click(createBtn);

    await screen.findByRole("heading", { name: "Create Content Block" });

    fireEvent.change(screen.getByLabelText("Block Type"), {
      target: { value: "text_image" },
    });
    fireEvent.change(screen.getByLabelText("Text Content *"), {
      target: { value: "Test description" },
    });

    const fileInput = screen.getByLabelText("Upload Image File");
    const testFile = new File(["bad-bytes"], "bad.jpg", {
      type: "image/jpeg",
    });
    fireEvent.change(fileInput, { target: { files: [testFile] } });

    fireEvent.click(screen.getByRole("button", { name: "Create Block" }));

    await waitFor(() => {
      expect(screen.getByText("File type not allowed")).toBeInTheDocument();
      expect(blockPostCount).toBe(0);
    });
  });

  it("rejects image upload response if backend returns a valid VIDEO media DTO", async () => {
    let blockPostCount = 0;

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({ data: mockAwardsBlocks });
      }),
      http.post(`${env.apiBaseUrl}/api/v1/admin/media/upload`, () => {
        // Structurally valid VIDEO media DTO returned on image upload request
        return HttpResponse.json({ data: mockVideoMedia });
      }),
      http.post(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        blockPostCount++;
        return HttpResponse.json({ data: mockAwardsBlocks[0] });
      }),
    );

    renderTestRouter(["/admin/content"]);

    await screen.findByText("First Prize Winner");

    const createBtn = screen.getAllByRole("button", {
      name: "Create content block",
    })[0]!;
    fireEvent.click(createBtn);

    await screen.findByRole("heading", { name: "Create Content Block" });

    fireEvent.change(screen.getByLabelText("Block Type"), {
      target: { value: "text_image" },
    });
    fireEvent.change(screen.getByLabelText("Text Content *"), {
      target: { value: "Test description" },
    });

    const fileInput = screen.getByLabelText("Upload Image File");
    const testFile = new File(["valid-image-bytes"], "valid.jpg", {
      type: "image/jpeg",
    });
    fireEvent.change(fileInput, { target: { files: [testFile] } });

    fireEvent.click(screen.getByRole("button", { name: "Create Block" }));

    await waitFor(() => {
      expect(blockPostCount).toBe(0);
      expect(
        screen.getByRole("heading", { name: "Create Content Block" }),
      ).toBeInTheDocument();
      expect(
        screen.getByText("The server returned an unexpected response."),
      ).toBeInTheDocument();
    });
  });

  it("rejects video upload response if backend returns a valid IMAGE media DTO", async () => {
    let blockPostCount = 0;

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({ data: mockAwardsBlocks });
      }),
      http.post(`${env.apiBaseUrl}/api/v1/admin/media/upload`, () => {
        // Structurally valid IMAGE media DTO returned on video upload request
        return HttpResponse.json({ data: mockImageMedia });
      }),
      http.post(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        blockPostCount++;
        return HttpResponse.json({ data: mockAwardsBlocks[0] });
      }),
    );

    renderTestRouter(["/admin/content"]);

    await screen.findByText("First Prize Winner");

    const createBtn = screen.getAllByRole("button", {
      name: "Create content block",
    })[0]!;
    fireEvent.click(createBtn);

    await screen.findByRole("heading", { name: "Create Content Block" });

    fireEvent.change(screen.getByLabelText("Block Type"), {
      target: { value: "text_video" },
    });
    fireEvent.change(screen.getByLabelText("Text Content *"), {
      target: { value: "Test description" },
    });

    const fileInput = screen.getByLabelText("Upload Video File");
    const testFile = new File(["valid-video-bytes"], "valid.mp4", {
      type: "video/mp4",
    });
    fireEvent.change(fileInput, { target: { files: [testFile] } });

    fireEvent.click(screen.getByRole("button", { name: "Create Block" }));

    await waitFor(() => {
      expect(blockPostCount).toBe(0);
      expect(
        screen.getByRole("heading", { name: "Create Content Block" }),
      ).toBeInTheDocument();
      expect(
        screen.getByText("The server returned an unexpected response."),
      ).toBeInTheDocument();
    });
  });

  it("rejects YouTube creation response if backend returns a valid IMAGE/VIDEO media DTO", async () => {
    let blockPostCount = 0;

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({ data: mockAwardsBlocks });
      }),
      http.post(`${env.apiBaseUrl}/api/v1/admin/media/youtube`, () => {
        // Structurally valid IMAGE media DTO returned on YouTube request
        return HttpResponse.json({ data: mockImageMedia });
      }),
      http.post(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        blockPostCount++;
        return HttpResponse.json({ data: mockAwardsBlocks[0] });
      }),
    );

    renderTestRouter(["/admin/content"]);

    await screen.findByText("First Prize Winner");

    const createBtn = screen.getAllByRole("button", {
      name: "Create content block",
    })[0]!;
    fireEvent.click(createBtn);

    await screen.findByRole("heading", { name: "Create Content Block" });

    fireEvent.change(screen.getByLabelText("Block Type"), {
      target: { value: "text_youtube" },
    });
    fireEvent.change(screen.getByLabelText("Text Content *"), {
      target: { value: "Test description" },
    });
    fireEvent.change(screen.getByLabelText("YouTube Video URL or ID"), {
      target: { value: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Block" }));

    await waitFor(() => {
      expect(blockPostCount).toBe(0);
      expect(
        screen.getByRole("heading", { name: "Create Content Block" }),
      ).toBeInTheDocument();
      expect(
        screen.getByText("The server returned an unexpected response."),
      ).toBeInTheDocument();
    });
  });

  it("rejects malformed image upload response (missing required fields) with safe normalized error message", async () => {
    let blockPostCount = 0;

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({ data: mockAwardsBlocks });
      }),
      http.post(`${env.apiBaseUrl}/api/v1/admin/media/upload`, () => {
        // HTTP 200 with missing required fields
        return HttpResponse.json({
          data: {
            type: "image",
            id: MEDIA_IDS.m1,
          },
        });
      }),
      http.post(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        blockPostCount++;
        return HttpResponse.json({ data: mockAwardsBlocks[0] });
      }),
    );

    renderTestRouter(["/admin/content"]);

    await screen.findByText("First Prize Winner");

    const createBtn = screen.getAllByRole("button", {
      name: "Create content block",
    })[0]!;
    fireEvent.click(createBtn);

    await screen.findByRole("heading", { name: "Create Content Block" });

    fireEvent.change(screen.getByLabelText("Block Type"), {
      target: { value: "text_image" },
    });
    fireEvent.change(screen.getByLabelText("Text Content *"), {
      target: { value: "Test description" },
    });

    const fileInput = screen.getByLabelText("Upload Image File");
    const testFile = new File(["valid-image-bytes"], "valid.jpg", {
      type: "image/jpeg",
    });
    fireEvent.change(fileInput, { target: { files: [testFile] } });

    fireEvent.click(screen.getByRole("button", { name: "Create Block" }));

    await waitFor(() => {
      expect(blockPostCount).toBe(0);
      expect(
        screen.getByText("The server returned an unexpected response."),
      ).toBeInTheDocument();
    });
  });

  it("rejects malformed video upload response with safe normalized error message", async () => {
    let blockPostCount = 0;

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({ data: mockAwardsBlocks });
      }),
      http.post(`${env.apiBaseUrl}/api/v1/admin/media/upload`, () => {
        // Missing required video fields
        return HttpResponse.json({
          data: {
            type: "video",
            id: MEDIA_IDS.m2,
          },
        });
      }),
      http.post(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        blockPostCount++;
        return HttpResponse.json({ data: mockAwardsBlocks[0] });
      }),
    );

    renderTestRouter(["/admin/content"]);

    await screen.findByText("First Prize Winner");

    const createBtn = screen.getAllByRole("button", {
      name: "Create content block",
    })[0]!;
    fireEvent.click(createBtn);

    await screen.findByRole("heading", { name: "Create Content Block" });

    fireEvent.change(screen.getByLabelText("Block Type"), {
      target: { value: "text_video" },
    });
    fireEvent.change(screen.getByLabelText("Text Content *"), {
      target: { value: "Test description" },
    });

    const fileInput = screen.getByLabelText("Upload Video File");
    const testFile = new File(["video-bytes"], "valid.mp4", {
      type: "video/mp4",
    });
    fireEvent.change(fileInput, { target: { files: [testFile] } });

    fireEvent.click(screen.getByRole("button", { name: "Create Block" }));

    await waitFor(() => {
      expect(blockPostCount).toBe(0);
      expect(
        screen.getByText("The server returned an unexpected response."),
      ).toBeInTheDocument();
    });
  });

  it("rejects malformed YouTube creation response with safe normalized error message", async () => {
    let blockPostCount = 0;

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({ data: mockAwardsBlocks });
      }),
      http.post(`${env.apiBaseUrl}/api/v1/admin/media/youtube`, () => {
        // Missing embed_url, thumbnail_url, etc.
        return HttpResponse.json({
          data: {
            type: "youtube",
            id: MEDIA_IDS.m3,
          },
        });
      }),
      http.post(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        blockPostCount++;
        return HttpResponse.json({ data: mockAwardsBlocks[0] });
      }),
    );

    renderTestRouter(["/admin/content"]);

    await screen.findByText("First Prize Winner");

    const createBtn = screen.getAllByRole("button", {
      name: "Create content block",
    })[0]!;
    fireEvent.click(createBtn);

    await screen.findByRole("heading", { name: "Create Content Block" });

    fireEvent.change(screen.getByLabelText("Block Type"), {
      target: { value: "text_youtube" },
    });
    fireEvent.change(screen.getByLabelText("Text Content *"), {
      target: { value: "Test description" },
    });
    fireEvent.change(screen.getByLabelText("YouTube Video URL or ID"), {
      target: { value: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Block" }));

    await waitFor(() => {
      expect(blockPostCount).toBe(0);
      expect(
        screen.getByText("The server returned an unexpected response."),
      ).toBeInTheDocument();
    });
  });

  it("edits block title/text without uploading media when media is untouched", async () => {
    let uploadCount = 0;
    let capturedPatchPayload: UpdateContentBlockRequest | null = null;

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({ data: mockAwardsBlocks });
      }),
      http.post(`${env.apiBaseUrl}/api/v1/admin/media/upload`, () => {
        uploadCount++;
        return HttpResponse.json({ data: mockImageMedia });
      }),
      http.patch(
        `${env.apiBaseUrl}/api/v1/admin/content-blocks/${BLOCK_IDS.b1}`,
        async ({ request }) => {
          capturedPatchPayload =
            (await request.json()) as UpdateContentBlockRequest;
          return HttpResponse.json({
            data: {
              ...mockAwardsBlocks[0]!,
              title: "Updated Title Only",
            },
          });
        },
      ),
    );

    renderTestRouter(["/admin/content"]);

    await screen.findByText("First Prize Winner");

    fireEvent.click(
      screen.getByRole("button", { name: "Edit block First Prize Winner" }),
    );

    await screen.findByRole("heading", { name: "Edit Content Block" });

    fireEvent.change(screen.getByLabelText("Title (Optional)"), {
      target: { value: "Updated Title Only" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(uploadCount).toBe(0);
      expect(capturedPatchPayload).toEqual({
        title: "Updated Title Only",
        text: "Awarded top saxophone honors in International Competition.",
      });
    });
  });

  it("blocks edit PATCH if video replacement upload returns an IMAGE media DTO", async () => {
    let patchCount = 0;

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({ data: mockAwardsBlocks });
      }),
      http.post(`${env.apiBaseUrl}/api/v1/admin/media/upload`, () => {
        // Structurally valid IMAGE media DTO returned on video upload
        return HttpResponse.json({ data: mockImageMedia });
      }),
      http.patch(
        `${env.apiBaseUrl}/api/v1/admin/content-blocks/${BLOCK_IDS.b2}`,
        () => {
          patchCount++;
          return HttpResponse.json({ data: mockAwardsBlocks[1] });
        },
      ),
    );

    renderTestRouter(["/admin/content"]);

    await screen.findByText("Gold Medal Ceremony");

    fireEvent.click(
      screen.getByRole("button", { name: "Edit block Gold Medal Ceremony" }),
    );

    await screen.findByRole("heading", { name: "Edit Content Block" });

    fireEvent.change(screen.getByLabelText("Block Type"), {
      target: { value: "text_video" },
    });

    const fileInput = screen.getByLabelText("Replace Video File");
    const testFile = new File(["video-bytes"], "test.mp4", {
      type: "video/mp4",
    });
    fireEvent.change(fileInput, { target: { files: [testFile] } });

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(patchCount).toBe(0);
      expect(
        screen.getByRole("heading", { name: "Edit Content Block" }),
      ).toBeInTheDocument();
      expect(
        screen.getByText("The server returned an unexpected response."),
      ).toBeInTheDocument();
    });
  });

  it("moves block between sections via stateful MSW server, invalidating both source and target queries", async () => {
    const serverBlocksBySection: Record<string, AdminContentBlockDto[]> = {
      [SECTION_IDS.awards]: [...mockAwardsBlocks],
      [SECTION_IDS.partners]: [...mockPartnersBlocks],
      [SECTION_IDS.festival]: [],
    };

    let patchCapturedPayload: UpdateContentBlockRequest | null = null;

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(
        `${env.apiBaseUrl}/api/v1/admin/content-blocks`,
        ({ request }) => {
          const url = new URL(request.url);
          const secId =
            url.searchParams.get("spa_section_id") || SECTION_IDS.awards;
          return HttpResponse.json({
            data: serverBlocksBySection[secId] || [],
          });
        },
      ),
      http.patch(
        `${env.apiBaseUrl}/api/v1/admin/content-blocks/${BLOCK_IDS.b2}`,
        async ({ request }) => {
          patchCapturedPayload =
            (await request.json()) as UpdateContentBlockRequest;

          // Perform stateful server move
          const awardsList = serverBlocksBySection[SECTION_IDS.awards]!;
          const idx = awardsList.findIndex((b) => b.id === BLOCK_IDS.b2);
          const movedBlock = awardsList[idx]!;

          const updatedBlock: AdminContentBlockDto = {
            ...movedBlock,
            spa_section_id: SECTION_IDS.partners,
            section_key: "partners",
            section_title: "Partners",
          };

          awardsList.splice(idx, 1);
          serverBlocksBySection[SECTION_IDS.partners]!.push(updatedBlock);

          return HttpResponse.json({ data: updatedBlock });
        },
      ),
    );

    renderTestRouter(["/admin/content"]);

    await screen.findByText("Gold Medal Ceremony");

    fireEvent.click(
      screen.getByRole("button", { name: "Edit block Gold Medal Ceremony" }),
    );

    await screen.findByRole("heading", { name: "Edit Content Block" });

    fireEvent.change(screen.getByLabelText("Section"), {
      target: { value: SECTION_IDS.partners },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    // Source section A refetch happens -> block disappears from Awards
    await waitFor(() => {
      expect(patchCapturedPayload).toEqual({
        spa_section_id: SECTION_IDS.partners,
        title: "Gold Medal Ceremony",
        text: "Receiving the gold medal on stage.",
        media_ids: [MEDIA_IDS.m1],
      });
      expect(screen.queryByText("Gold Medal Ceremony")).toBeNull();
    });

    // Switch to Partners section -> target section B refetch shows moved block with same ID and media
    const select = screen.getByLabelText("Select Section:");
    fireEvent.change(select, { target: { value: SECTION_IDS.partners } });

    await screen.findByText("Gold Medal Ceremony");
    expect(screen.getByText("Sponsor Documentary")).toBeInTheDocument();
  });

  it("deletes block with confirmation dialog restoring focus to Create button without media DELETE call", async () => {
    let mediaDeleteCount = 0;
    let blockDeleteId = "";
    const serverBlocks = [...mockAwardsBlocks];

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({ data: serverBlocks });
      }),
      http.delete(
        `${env.apiBaseUrl}/api/v1/admin/content-blocks/:id`,
        ({ params }) => {
          blockDeleteId = params.id as string;
          const idx = serverBlocks.findIndex((b) => b.id === params.id);
          if (idx !== -1) {
            serverBlocks.splice(idx, 1);
          }
          return HttpResponse.json({ data: { message: "Deleted" } });
        },
      ),
      http.delete(`${env.apiBaseUrl}/api/v1/admin/media/:id`, () => {
        mediaDeleteCount++;
        return HttpResponse.json({ data: { message: "Deleted" } });
      }),
    );

    renderTestRouter(["/admin/content"]);

    await screen.findByText("Gold Medal Ceremony");

    fireEvent.click(
      screen.getByRole("button", { name: "Delete block Gold Medal Ceremony" }),
    );

    await screen.findByRole("heading", { name: "Delete Content Block" });

    fireEvent.click(screen.getByRole("button", { name: /^Delete Block$/i }));

    await waitFor(() => {
      expect(blockDeleteId).toBe(BLOCK_IDS.b2);
      expect(mediaDeleteCount).toBe(0);
      expect(screen.queryByText("Gold Medal Ceremony")).toBeNull();
    });

    const createBtn = screen.getAllByRole("button", {
      name: "Create content block",
    })[0]!;

    await waitFor(() => {
      expect(createBtn).toHaveFocus();
    });
  });

  it("handles YouTube backend 400 failure without creating content block", async () => {
    let blockPostCount = 0;

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({ data: mockAwardsBlocks });
      }),
      http.post(`${env.apiBaseUrl}/api/v1/admin/media/youtube`, () => {
        return HttpResponse.json(
          {
            error: {
              code: "INVALID_YOUTUBE_URL",
              message: "Invalid YouTube URL provided",
            },
          },
          { status: 400 },
        );
      }),
      http.post(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        blockPostCount++;
        return HttpResponse.json({ data: mockAwardsBlocks[0] });
      }),
    );

    renderTestRouter(["/admin/content"]);

    await screen.findByText("First Prize Winner");

    const createBtn = screen.getAllByRole("button", {
      name: "Create content block",
    })[0]!;
    fireEvent.click(createBtn);

    await screen.findByRole("heading", { name: "Create Content Block" });

    fireEvent.change(screen.getByLabelText("Block Type"), {
      target: { value: "text_youtube" },
    });
    fireEvent.change(screen.getByLabelText("Text Content *"), {
      target: { value: "Invalid URL test" },
    });
    fireEvent.change(screen.getByLabelText("YouTube Video URL or ID"), {
      target: { value: "https://not-youtube.com/abc" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Block" }));

    await waitFor(() => {
      expect(
        screen.getByText("Invalid YouTube URL provided"),
      ).toBeInTheDocument();
      expect(blockPostCount).toBe(0);
      expect(
        screen.getByRole("heading", { name: "Create Content Block" }),
      ).toBeInTheDocument();
    });
  });

  it("prevents duplicate block submit (single POST request executed)", async () => {
    let blockPostCount = 0;

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({ data: mockAwardsBlocks });
      }),
      http.post(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, async () => {
        blockPostCount++;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return HttpResponse.json({
          data: {
            ...mockAwardsBlocks[0]!,
            id: BLOCK_IDS.b4,
          },
        });
      }),
    );

    renderTestRouter(["/admin/content"]);

    await screen.findByText("First Prize Winner");

    const createBtn = screen.getAllByRole("button", {
      name: "Create content block",
    })[0]!;
    fireEvent.click(createBtn);

    await screen.findByRole("heading", { name: "Create Content Block" });

    fireEvent.change(screen.getByLabelText("Text Content *"), {
      target: { value: "Double submit test" },
    });

    const submitBtn = screen.getByRole("button", { name: "Create Block" });
    fireEvent.click(submitBtn);
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(blockPostCount).toBe(1);
    });
  });

  it("prevents duplicate media operations during media-backed block creation", async () => {
    let uploadCount = 0;
    let blockPostCount = 0;

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({ data: mockAwardsBlocks });
      }),
      http.post(`${env.apiBaseUrl}/api/v1/admin/media/upload`, async () => {
        uploadCount++;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return HttpResponse.json({ data: mockImageMedia });
      }),
      http.post(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, async () => {
        blockPostCount++;
        return HttpResponse.json({ data: mockAwardsBlocks[1] });
      }),
    );

    renderTestRouter(["/admin/content"]);

    await screen.findByText("First Prize Winner");

    const createBtn = screen.getAllByRole("button", {
      name: "Create content block",
    })[0]!;
    fireEvent.click(createBtn);

    await screen.findByRole("heading", { name: "Create Content Block" });

    fireEvent.change(screen.getByLabelText("Block Type"), {
      target: { value: "text_image" },
    });
    fireEvent.change(screen.getByLabelText("Text Content *"), {
      target: { value: "Image block test" },
    });

    const fileInput = screen.getByLabelText("Upload Image File");
    const testFile = new File(["bytes"], "image.jpg", { type: "image/jpeg" });
    fireEvent.change(fileInput, { target: { files: [testFile] } });

    const submitBtn = screen.getByRole("button", { name: "Create Block" });
    await waitFor(() => {
      expect(submitBtn).toBeEnabled();
    });
    fireEvent.click(submitBtn);
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(uploadCount).toBe(1);
      expect(blockPostCount).toBe(1);
    });
  });

  it("displays canonical server-assigned sort_order without client order allocation", async () => {
    const serverBlocks: AdminContentBlockDto[] = [...mockAwardsBlocks];

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({ data: serverBlocks });
      }),
      http.post(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, async () => {
        const newBlock: AdminContentBlockDto = {
          id: BLOCK_IDS.b4,
          spa_section_id: SECTION_IDS.awards,
          section_key: "awards",
          section_title: "Awards",
          block_type: "text",
          title: "Distinctive Sort Order Block",
          text: "Server assigns order 70.",
          media: null,
          sort_order: 70,
          is_visible: true,
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        };
        serverBlocks.push(newBlock);
        return HttpResponse.json({ data: newBlock });
      }),
    );

    renderTestRouter(["/admin/content"]);

    await screen.findByText("First Prize Winner");

    const createBtn = screen.getAllByRole("button", {
      name: "Create content block",
    })[0]!;
    fireEvent.click(createBtn);

    await screen.findByRole("heading", { name: "Create Content Block" });

    fireEvent.change(screen.getByLabelText("Text Content *"), {
      target: { value: "Server assigns order 70." },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Block" }));

    await screen.findByText("Distinctive Sort Order Block");
    expect(screen.getByText("Order: #70")).toBeInTheDocument();
  });

  it("executes 0 detail GET requests when rendering section with 10 ContentBlocks (No-N+1)", async () => {
    let listGetCount = 0;
    let detailGetCount = 0;

    const tenBlocks: AdminContentBlockDto[] = Array.from(
      { length: 10 },
      (_, i) => ({
        id: `a${i}111111-1111-4111-8111-111111111111`,
        spa_section_id: SECTION_IDS.awards,
        section_key: "awards",
        section_title: "Awards",
        block_type: "text",
        title: `Block ${i + 1}`,
        text: `Content for block ${i + 1}`,
        media: null,
        sort_order: (i + 1) * 10,
        is_visible: true,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      }),
    );

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        listGetCount++;
        return HttpResponse.json({ data: tenBlocks });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks/:id`, () => {
        detailGetCount++;
        return HttpResponse.json({ data: tenBlocks[0] });
      }),
    );

    renderTestRouter(["/admin/content"]);

    await screen.findByText("Block 1");
    expect(screen.getByText("Block 10")).toBeInTheDocument();

    expect(listGetCount).toBe(1);
    expect(detailGetCount).toBe(0);
  });

  it("preserves draft fields and leaves list unchanged when edit PATCH fails", async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({ data: mockAwardsBlocks });
      }),
      http.patch(
        `${env.apiBaseUrl}/api/v1/admin/content-blocks/${BLOCK_IDS.b1}`,
        () => {
          return HttpResponse.json(
            {
              error: { code: "SERVER_ERROR", message: "Database patch error" },
            },
            { status: 500 },
          );
        },
      ),
    );

    renderTestRouter(["/admin/content"]);

    await screen.findByText("First Prize Winner");

    fireEvent.click(
      screen.getByRole("button", { name: "Edit block First Prize Winner" }),
    );

    await screen.findByRole("heading", { name: "Edit Content Block" });

    fireEvent.change(screen.getByLabelText("Title (Optional)"), {
      target: { value: "Attempted Unsaved Title" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(screen.getByText("Database patch error")).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Edit Content Block" }),
      ).toBeInTheDocument();
      expect(screen.getByLabelText("Title (Optional)")).toHaveValue(
        "Attempted Unsaved Title",
      );
    });
  });

  it("preserves block row in DOM and issues 0 media DELETE calls when block DELETE fails", async () => {
    let mediaDeleteCount = 0;

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({ data: mockAwardsBlocks });
      }),
      http.delete(
        `${env.apiBaseUrl}/api/v1/admin/content-blocks/${BLOCK_IDS.b2}`,
        () => {
          return HttpResponse.json(
            {
              error: {
                code: "SERVER_ERROR",
                message: "Delete failed on server",
              },
            },
            { status: 500 },
          );
        },
      ),
      http.delete(`${env.apiBaseUrl}/api/v1/admin/media/:id`, () => {
        mediaDeleteCount++;
        return HttpResponse.json({ data: { message: "Deleted" } });
      }),
    );

    renderTestRouter(["/admin/content"]);

    await screen.findByText("Gold Medal Ceremony");

    fireEvent.click(
      screen.getByRole("button", { name: "Delete block Gold Medal Ceremony" }),
    );

    await screen.findByRole("heading", { name: "Delete Content Block" });

    fireEvent.click(screen.getByRole("button", { name: /^Delete Block$/i }));

    await waitFor(() => {
      expect(screen.getByText("Delete failed on server")).toBeInTheDocument();
      expect(mediaDeleteCount).toBe(0);
      expect(screen.getByText("Gold Medal Ceremony")).toBeInTheDocument();
    });
  });

  it("enforces strict media compatibility during creation (blocks POST when media missing)", async () => {
    let postCount = 0;

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({ data: mockAwardsBlocks });
      }),
      http.post(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        postCount++;
        return HttpResponse.json({ data: mockAwardsBlocks[0] });
      }),
    );

    renderTestRouter(["/admin/content"]);

    await screen.findByText("First Prize Winner");

    const createBtn = screen.getAllByRole("button", {
      name: "Create content block",
    })[0]!;
    fireEvent.click(createBtn);

    await screen.findByRole("heading", { name: "Create Content Block" });

    // 1. text_image without image
    fireEvent.change(screen.getByLabelText("Block Type"), {
      target: { value: "text_image" },
    });
    fireEvent.change(screen.getByLabelText("Text Content *"), {
      target: { value: "Image text" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Block" }));

    await waitFor(() => {
      expect(
        screen.getByText("An image file is required for Text + Image blocks."),
      ).toBeInTheDocument();
      expect(postCount).toBe(0);
    });

    // 2. text_video without video
    fireEvent.change(screen.getByLabelText("Block Type"), {
      target: { value: "text_video" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Block" }));

    await waitFor(() => {
      expect(
        screen.getByText("A video file is required for Text + Video blocks."),
      ).toBeInTheDocument();
      expect(postCount).toBe(0);
    });

    // 3. text_youtube without YouTube URL
    fireEvent.change(screen.getByLabelText("Block Type"), {
      target: { value: "text_youtube" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Block" }));

    await waitFor(() => {
      expect(
        screen.getByText(
          "A YouTube URL or ID is required for Text + YouTube blocks.",
        ),
      ).toBeInTheDocument();
      expect(postCount).toBe(0);
    });
  });

  it("requires new compatible media when converting block type from one media-backed type to another", async () => {
    let patchCount = 0;

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({ data: mockAwardsBlocks });
      }),
      http.patch(
        `${env.apiBaseUrl}/api/v1/admin/content-blocks/${BLOCK_IDS.b2}`,
        () => {
          patchCount++;
          return HttpResponse.json({ data: mockAwardsBlocks[1] });
        },
      ),
    );

    renderTestRouter(["/admin/content"]);

    await screen.findByText("Gold Medal Ceremony");

    fireEvent.click(
      screen.getByRole("button", { name: "Edit block Gold Medal Ceremony" }),
    );

    await screen.findByRole("heading", { name: "Edit Content Block" });

    // Existing block is text_image with image media M1. Convert to text_video without uploading video file.
    fireEvent.change(screen.getByLabelText("Block Type"), {
      target: { value: "text_video" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(
        screen.getByText("A video file is required for Text + Video blocks."),
      ).toBeInTheDocument();
      expect(patchCount).toBe(0);
    });
  });

  it("detaches media explicitly via media_id: null when converting media-backed block to text", async () => {
    let capturedPatchPayload: UpdateContentBlockRequest | null = null;

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({ data: mockAwardsBlocks });
      }),
      http.patch(
        `${env.apiBaseUrl}/api/v1/admin/content-blocks/${BLOCK_IDS.b2}`,
        async ({ request }) => {
          capturedPatchPayload =
            (await request.json()) as UpdateContentBlockRequest;
          return HttpResponse.json({
            data: {
              ...mockAwardsBlocks[1]!,
              block_type: "text",
              media: null,
            },
          });
        },
      ),
    );

    renderTestRouter(["/admin/content"]);

    await screen.findByText("Gold Medal Ceremony");

    fireEvent.click(
      screen.getByRole("button", { name: "Edit block Gold Medal Ceremony" }),
    );

    await screen.findByRole("heading", { name: "Edit Content Block" });

    fireEvent.change(screen.getByLabelText("Block Type"), {
      target: { value: "text" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(capturedPatchPayload).toEqual({
        block_type: "text",
        title: "Gold Medal Ceremony",
        text: "Receiving the gold medal on stage.",
        media_id: null,
      });
    });
  });

  it("handles 403 Forbidden error on content blocks GET without auth refresh", async () => {
    let refreshCalls = 0;

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json(
          { error: { code: "FORBIDDEN", message: "Forbidden access" } },
          { status: 403 },
        );
      }),
      http.post(`${env.apiBaseUrl}/api/v1/auth/refresh`, () => {
        refreshCalls++;
        return HttpResponse.json({ data: {} });
      }),
    );

    renderTestRouter(["/admin/content"]);

    await screen.findByText("Forbidden access");
    expect(refreshCalls).toBe(0);
  });

  it("handles malformed content block API response safely via Zod validation", async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({
          data: [
            {
              id: "not-a-uuid",
              block_type: "invalid_type",
            },
          ],
        });
      }),
    );

    renderTestRouter(["/admin/content"]);

    await screen.findByRole("alert");
    expect(
      screen.getByText("The server returned an unexpected response."),
    ).toBeInTheDocument();
  });

  it("rejects unknown attached media_type via strict Zod enum validation", async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({
          data: [
            {
              id: BLOCK_IDS.b1,
              spa_section_id: SECTION_IDS.awards,
              section_key: "awards",
              section_title: "Awards",
              block_type: "text_image",
              text: "Invalid media type block",
              media: {
                id: MEDIA_IDS.m1,
                media_type: "banana",
                storage_provider: "local",
              },
              sort_order: 10,
              is_visible: true,
              created_at: "2026-01-01T00:00:00Z",
              updated_at: "2026-01-01T00:00:00Z",
            },
          ],
        });
      }),
    );

    renderTestRouter(["/admin/content"]);

    await screen.findByRole("alert");
    expect(
      screen.getByText("The server returned an unexpected response."),
    ).toBeInTheDocument();
  });

  /* FRONTEND F7 — ContentBlock Reorder + Accessible Interaction */

  it("sends exact reorder POST request with items array to /api/v1/admin/spa-sections/{id}/content-blocks/reorder", async () => {
    let capturedPath = "";
    let capturedPayload: ReorderContentBlocksRequest | null = null;
    const serverBlocks = [...mockAwardsBlocks];

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({ data: serverBlocks });
      }),
      http.post(
        `${env.apiBaseUrl}/api/v1/admin/spa-sections/:spaSectionId/content-blocks/reorder`,
        async ({ request, params }) => {
          capturedPath = `/api/v1/admin/spa-sections/${params.spaSectionId}/content-blocks/reorder`;
          capturedPayload =
            (await request.json()) as ReorderContentBlocksRequest;

          // Swap stateful server blocks
          serverBlocks.reverse();
          return HttpResponse.json({ data: { message: "Reordered" } });
        },
      ),
    );

    renderTestRouter(["/admin/content"]);

    await screen.findByText("First Prize Winner");

    const moveDownBtn = screen.getByRole("button", {
      name: 'Move "First Prize Winner" down',
    });
    fireEvent.click(moveDownBtn);

    await waitFor(() => {
      expect(capturedPath).toBe(
        `/api/v1/admin/spa-sections/${SECTION_IDS.awards}/content-blocks/reorder`,
      );
      expect(capturedPayload).toEqual({
        items: [
          { id: BLOCK_IDS.b2, sort_order: 10 },
          { id: BLOCK_IDS.b1, sort_order: 20 },
        ],
      });
    });
  });

  it("moves block down when clicking Move Down button and updates position UI", async () => {
    const serverBlocks = [...mockAwardsBlocks];

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({ data: serverBlocks });
      }),
      http.post(
        `${env.apiBaseUrl}/api/v1/admin/spa-sections/:spaSectionId/content-blocks/reorder`,
        () => {
          const temp = serverBlocks[0]!;
          serverBlocks[0] = serverBlocks[1]!;
          serverBlocks[1] = temp;
          return HttpResponse.json({ data: { message: "Reordered" } });
        },
      ),
    );

    renderTestRouter(["/admin/content"]);

    await screen.findByText("First Prize Winner");
    expect(screen.getByText("Position 1 of 2")).toBeInTheDocument();

    const moveDownBtn = screen.getByRole("button", {
      name: 'Move "First Prize Winner" down',
    });
    fireEvent.click(moveDownBtn);

    await waitFor(() => {
      expect(
        screen.getByText('Moved "First Prize Winner" to position 2 of 2.'),
      ).toBeInTheDocument();
    });
  });

  it("moves block up when clicking Move Up button and updates position UI", async () => {
    const serverBlocks = [...mockAwardsBlocks];

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({ data: serverBlocks });
      }),
      http.post(
        `${env.apiBaseUrl}/api/v1/admin/spa-sections/:spaSectionId/content-blocks/reorder`,
        () => {
          const temp = serverBlocks[0]!;
          serverBlocks[0] = serverBlocks[1]!;
          serverBlocks[1] = temp;
          return HttpResponse.json({ data: { message: "Reordered" } });
        },
      ),
    );

    renderTestRouter(["/admin/content"]);

    await screen.findByText("Gold Medal Ceremony");

    const moveUpBtn = screen.getByRole("button", {
      name: 'Move "Gold Medal Ceremony" up',
    });
    fireEvent.click(moveUpBtn);

    await waitFor(() => {
      expect(
        screen.getByText('Moved "Gold Medal Ceremony" to position 1 of 2.'),
      ).toBeInTheDocument();
    });
  });

  it("disables Move Up on first block and Move Down on last block", async () => {
    let reorderCalls = 0;

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({ data: mockAwardsBlocks });
      }),
      http.post(
        `${env.apiBaseUrl}/api/v1/admin/spa-sections/:spaSectionId/content-blocks/reorder`,
        () => {
          reorderCalls++;
          return HttpResponse.json({ data: { message: "Reordered" } });
        },
      ),
    );

    renderTestRouter(["/admin/content"]);

    await screen.findByText("First Prize Winner");

    const firstMoveUp = screen.getByRole("button", {
      name: 'Move "First Prize Winner" up',
    });
    const lastMoveDown = screen.getByRole("button", {
      name: 'Move "Gold Medal Ceremony" down',
    });

    expect(firstMoveUp).toBeDisabled();
    expect(lastMoveDown).toBeDisabled();

    fireEvent.click(firstMoveUp);
    fireEvent.click(lastMoveDown);

    expect(reorderCalls).toBe(0);
  });

  it("disables both Move Up and Move Down when section has only 1 block", async () => {
    let reorderCalls = 0;

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({ data: [mockAwardsBlocks[0]!] });
      }),
      http.post(
        `${env.apiBaseUrl}/api/v1/admin/spa-sections/:spaSectionId/content-blocks/reorder`,
        () => {
          reorderCalls++;
          return HttpResponse.json({ data: { message: "Reordered" } });
        },
      ),
    );

    renderTestRouter(["/admin/content"]);

    await screen.findByText("First Prize Winner");

    const moveUp = screen.getByRole("button", {
      name: 'Move "First Prize Winner" up',
    });
    const moveDown = screen.getByRole("button", {
      name: 'Move "First Prize Winner" down',
    });

    expect(moveUp).toBeDisabled();
    expect(moveDown).toBeDisabled();

    fireEvent.click(moveUp);
    fireEvent.click(moveDown);

    expect(reorderCalls).toBe(0);
  });

  it("canonical server order wins after reorder", async () => {
    let getCount = 0;
    // Initial GET returns [b1, b2]. Refetch after reorder returns canonical order [b2, b1]
    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        getCount++;
        if (getCount === 1) {
          return HttpResponse.json({
            data: [mockAwardsBlocks[0]!, mockAwardsBlocks[1]!],
          });
        }
        return HttpResponse.json({
          data: [mockAwardsBlocks[1]!, mockAwardsBlocks[0]!],
        });
      }),
      http.post(
        `${env.apiBaseUrl}/api/v1/admin/spa-sections/:spaSectionId/content-blocks/reorder`,
        () => {
          return HttpResponse.json({ data: { message: "Reordered" } });
        },
      ),
    );

    renderTestRouter(["/admin/content"]);

    await screen.findByText("First Prize Winner");

    const moveDownBtn = screen.getByRole("button", {
      name: 'Move "First Prize Winner" down',
    });
    fireEvent.click(moveDownBtn);

    await screen.findByText('Moved "First Prize Winner" to position 2 of 2.');

    // Verify DOM order reflects server canonical response [Gold Medal Ceremony, First Prize Winner]
    const cards = screen.getAllByRole("heading", { level: 3 });
    expect(cards[0]).toHaveTextContent("Gold Medal Ceremony");
    expect(cards[1]).toHaveTextContent("First Prize Winner");
  });

  it("displays exact server-assigned sort_order values after reorder", async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({
          data: [
            { ...mockAwardsBlocks[0]!, sort_order: 5 },
            { ...mockAwardsBlocks[1]!, sort_order: 55 },
          ],
        });
      }),
      http.post(
        `${env.apiBaseUrl}/api/v1/admin/spa-sections/:spaSectionId/content-blocks/reorder`,
        () => {
          return HttpResponse.json({ data: { message: "Reordered" } });
        },
      ),
    );

    renderTestRouter(["/admin/content"]);

    await screen.findByText("First Prize Winner");
    expect(screen.getByText("Order: #5")).toBeInTheDocument();
    expect(screen.getByText("Order: #55")).toBeInTheDocument();
  });

  it("rolls back local order and displays error message when reorder POST fails", async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({ data: mockAwardsBlocks });
      }),
      http.post(
        `${env.apiBaseUrl}/api/v1/admin/spa-sections/:spaSectionId/content-blocks/reorder`,
        () => {
          return HttpResponse.json(
            {
              error: {
                code: "REORDER_FAILED",
                message: "Failed to reorder blocks",
              },
            },
            { status: 500 },
          );
        },
      ),
    );

    renderTestRouter(["/admin/content"]);

    await screen.findByText("First Prize Winner");

    const moveDownBtn = screen.getByRole("button", {
      name: 'Move "First Prize Winner" down',
    });
    fireEvent.click(moveDownBtn);

    await waitFor(() => {
      expect(screen.getByText("Failed to reorder blocks")).toBeInTheDocument();
      const cards = screen
        .getAllByRole("heading", { level: 3 })
        .filter((h) => !h.textContent?.startsWith("Error"));
      expect(cards[0]).toHaveTextContent("First Prize Winner");
      expect(cards[1]).toHaveTextContent("Gold Medal Ceremony");
    });
  });

  it("preserves request_id on reorder API failure if returned by backend", async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({ data: mockAwardsBlocks });
      }),
      http.post(
        `${env.apiBaseUrl}/api/v1/admin/spa-sections/:spaSectionId/content-blocks/reorder`,
        () => {
          return HttpResponse.json(
            {
              error: {
                code: "INVALID_ORDER",
                message: "Invalid reorder payload",
                request_id: "req_reorder_999",
              },
            },
            { status: 422 },
          );
        },
      ),
    );

    renderTestRouter(["/admin/content"]);

    await screen.findByText("First Prize Winner");

    const moveDownBtn = screen.getByRole("button", {
      name: 'Move "First Prize Winner" down',
    });
    fireEvent.click(moveDownBtn);

    await waitFor(() => {
      expect(screen.getByText("Invalid reorder payload")).toBeInTheDocument();
      expect(screen.getByText(/req_reorder_999/i)).toBeInTheDocument();
    });
  });

  it("prevents duplicate reorder mutation when clicking Move button rapidly", async () => {
    let reorderPostCount = 0;

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({ data: mockAwardsBlocks });
      }),
      http.post(
        `${env.apiBaseUrl}/api/v1/admin/spa-sections/:spaSectionId/content-blocks/reorder`,
        async () => {
          reorderPostCount++;
          await new Promise((resolve) => setTimeout(resolve, 50));
          return HttpResponse.json({ data: { message: "Reordered" } });
        },
      ),
    );

    renderTestRouter(["/admin/content"]);

    await screen.findByText("First Prize Winner");

    const moveDownBtn = screen.getByRole("button", {
      name: 'Move "First Prize Winner" down',
    });
    fireEvent.click(moveDownBtn);
    fireEvent.click(moveDownBtn);

    await waitFor(() => {
      expect(reorderPostCount).toBe(1);
    });
  });

  it("disables reorder controls and section select during pending reorder mutation", async () => {
    let resolveReorder: (value: unknown) => void;
    const reorderPromise = new Promise((res) => {
      resolveReorder = res;
    });

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({ data: mockAwardsBlocks });
      }),
      http.post(
        `${env.apiBaseUrl}/api/v1/admin/spa-sections/:spaSectionId/content-blocks/reorder`,
        async () => {
          await reorderPromise;
          return HttpResponse.json({ data: { message: "Reordered" } });
        },
      ),
    );

    renderTestRouter(["/admin/content"]);

    await screen.findByText("First Prize Winner");

    const moveDownBtn = screen.getByRole("button", {
      name: 'Move "First Prize Winner" down',
    });
    const sectionSelect = screen.getByLabelText("Select Section:");

    fireEvent.click(moveDownBtn);

    await waitFor(() => {
      expect(sectionSelect).toBeDisabled();
      expect(moveDownBtn).toBeDisabled();
    });

    resolveReorder!(true);

    await waitFor(() => {
      expect(sectionSelect).not.toBeDisabled();
    });
  });

  it("scopes reorder mutation and invalidation strictly to selected section", async () => {
    let reorderSectionId = "";

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({ data: mockAwardsBlocks });
      }),
      http.post(
        `${env.apiBaseUrl}/api/v1/admin/spa-sections/:spaSectionId/content-blocks/reorder`,
        ({ params }) => {
          reorderSectionId = params.spaSectionId as string;
          return HttpResponse.json({ data: { message: "Reordered" } });
        },
      ),
    );

    renderTestRouter(["/admin/content"]);

    await screen.findByText("First Prize Winner");

    const moveDownBtn = screen.getByRole("button", {
      name: 'Move "First Prize Winner" down',
    });
    fireEvent.click(moveDownBtn);

    await waitFor(() => {
      expect(reorderSectionId).toBe(SECTION_IDS.awards);
    });
  });

  it("supports arbitrary section and block titles during reorder", async () => {
    const customSection: AdminSpaSectionDto = {
      id: "99999999-9999-4999-8999-999999999999",
      key: "archive",
      title: "Research Archive",
      navigation_label: "Archive",
      sort_order: 10,
      is_visible: true,
      content_block_count: 3,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };

    const customBlocks: AdminContentBlockDto[] = [
      {
        id: "c1111111-1111-4111-8111-111111111111",
        spa_section_id: customSection.id,
        section_key: "archive",
        section_title: "Research Archive",
        block_type: "text",
        title: "Early Experiments",
        text: "Initial trial results.",
        media: null,
        sort_order: 10,
        is_visible: true,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
      {
        id: "c2222222-2222-4222-8222-222222222222",
        spa_section_id: customSection.id,
        section_key: "archive",
        section_title: "Research Archive",
        block_type: "text",
        title: "Conference Notes",
        text: "Presentation feedback.",
        media: null,
        sort_order: 20,
        is_visible: true,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
      {
        id: "c3333333-3333-4333-8333-333333333333",
        spa_section_id: customSection.id,
        section_key: "archive",
        section_title: "Research Archive",
        block_type: "text",
        title: "Field Photos",
        text: "Photographs from location.",
        media: null,
        sort_order: 30,
        is_visible: true,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ];

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: [customSection] });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({ data: customBlocks });
      }),
      http.post(
        `${env.apiBaseUrl}/api/v1/admin/spa-sections/:spaSectionId/content-blocks/reorder`,
        () => {
          const temp = customBlocks[0]!;
          customBlocks[0] = customBlocks[1]!;
          customBlocks[1] = temp;
          return HttpResponse.json({ data: { message: "Reordered" } });
        },
      ),
    );

    renderTestRouter(["/admin/content"]);

    await screen.findByText("Early Experiments");

    const moveDownBtn = screen.getByRole("button", {
      name: 'Move "Early Experiments" down',
    });
    fireEvent.click(moveDownBtn);

    await waitFor(() => {
      expect(
        screen.getByText('Moved "Early Experiments" to position 2 of 3.'),
      ).toBeInTheDocument();
    });
  });

  it("edits correct block ID after reorder", async () => {
    const serverBlocks = [...mockAwardsBlocks];

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({ data: serverBlocks });
      }),
      http.post(
        `${env.apiBaseUrl}/api/v1/admin/spa-sections/:spaSectionId/content-blocks/reorder`,
        () => {
          serverBlocks.reverse();
          return HttpResponse.json({ data: { message: "Reordered" } });
        },
      ),
    );

    renderTestRouter(["/admin/content"]);

    await screen.findByText("First Prize Winner");

    const moveDownBtn = screen.getByRole("button", {
      name: 'Move "First Prize Winner" down',
    });
    fireEvent.click(moveDownBtn);

    await screen.findByText('Moved "First Prize Winner" to position 2 of 2.');

    // Edit Gold Medal Ceremony (now block 1)
    fireEvent.click(
      screen.getByRole("button", { name: "Edit block Gold Medal Ceremony" }),
    );

    await screen.findByRole("heading", { name: "Edit Content Block" });
    expect(screen.getByLabelText("Title (Optional)")).toHaveValue(
      "Gold Medal Ceremony",
    );
  });

  it("deletes correct block ID after reorder", async () => {
    let deletedBlockId = "";
    const serverBlocks = [...mockAwardsBlocks];

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({ data: serverBlocks });
      }),
      http.post(
        `${env.apiBaseUrl}/api/v1/admin/spa-sections/:spaSectionId/content-blocks/reorder`,
        () => {
          serverBlocks.reverse();
          return HttpResponse.json({ data: { message: "Reordered" } });
        },
      ),
      http.delete(
        `${env.apiBaseUrl}/api/v1/admin/content-blocks/:id`,
        ({ params }) => {
          deletedBlockId = params.id as string;
          return HttpResponse.json({ data: { message: "Deleted" } });
        },
      ),
    );

    renderTestRouter(["/admin/content"]);

    await screen.findByText("First Prize Winner");

    const moveDownBtn = screen.getByRole("button", {
      name: 'Move "First Prize Winner" down',
    });
    fireEvent.click(moveDownBtn);

    await screen.findByText('Moved "First Prize Winner" to position 2 of 2.');

    // Delete Gold Medal Ceremony
    fireEvent.click(
      screen.getByRole("button", { name: "Delete block Gold Medal Ceremony" }),
    );

    await screen.findByRole("heading", { name: "Delete Content Block" });

    fireEvent.click(screen.getByRole("button", { name: /^Delete Block$/i }));

    await waitFor(() => {
      expect(deletedBlockId).toBe(BLOCK_IDS.b2);
    });
  });

  it("reordering media-backed blocks preserves media relations with 0 media API calls", async () => {
    let mediaUploadCount = 0;
    let mediaYoutubeCount = 0;
    let mediaDeleteCount = 0;

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({ data: mockAwardsBlocks });
      }),
      http.post(
        `${env.apiBaseUrl}/api/v1/admin/spa-sections/:spaSectionId/content-blocks/reorder`,
        () => {
          return HttpResponse.json({ data: { message: "Reordered" } });
        },
      ),
      http.post(`${env.apiBaseUrl}/api/v1/admin/media/upload`, () => {
        mediaUploadCount++;
        return HttpResponse.json({ data: mockImageMedia });
      }),
      http.post(`${env.apiBaseUrl}/api/v1/admin/media/youtube`, () => {
        mediaYoutubeCount++;
        return HttpResponse.json({ data: mockYoutubeMedia });
      }),
      http.delete(`${env.apiBaseUrl}/api/v1/admin/media/:id`, () => {
        mediaDeleteCount++;
        return HttpResponse.json({ data: { message: "Deleted" } });
      }),
    );

    renderTestRouter(["/admin/content"]);

    await screen.findByText("First Prize Winner");

    const moveDownBtn = screen.getByRole("button", {
      name: 'Move "First Prize Winner" down',
    });
    fireEvent.click(moveDownBtn);

    await waitFor(() => {
      expect(mediaUploadCount).toBe(0);
      expect(mediaYoutubeCount).toBe(0);
      expect(mediaDeleteCount).toBe(0);
    });
  });

  it("handles 403 Forbidden error on reorder without auth refresh", async () => {
    let refreshCalls = 0;

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({ data: mockAwardsBlocks });
      }),
      http.post(
        `${env.apiBaseUrl}/api/v1/admin/spa-sections/:spaSectionId/content-blocks/reorder`,
        () => {
          return HttpResponse.json(
            {
              error: {
                code: "FORBIDDEN",
                message: "Forbidden reorder action",
              },
            },
            { status: 403 },
          );
        },
      ),
      http.post(`${env.apiBaseUrl}/api/v1/auth/refresh`, () => {
        refreshCalls++;
        return HttpResponse.json({ data: {} });
      }),
    );

    renderTestRouter(["/admin/content"]);

    await screen.findByText("First Prize Winner");

    const moveDownBtn = screen.getByRole("button", {
      name: 'Move "First Prize Winner" down',
    });
    fireEvent.click(moveDownBtn);

    await waitFor(() => {
      expect(screen.getByText("Forbidden reorder action")).toBeInTheDocument();
      expect(refreshCalls).toBe(0);
    });
  });

  it("allows both admin and super_admin roles to reorder content blocks", async () => {
    let reorderCalled = false;

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({ data: mockAwardsBlocks });
      }),
      http.post(
        `${env.apiBaseUrl}/api/v1/admin/spa-sections/:spaSectionId/content-blocks/reorder`,
        () => {
          reorderCalled = true;
          return HttpResponse.json({ data: { message: "Reordered" } });
        },
      ),
    );

    renderTestRouter(["/admin/content"], mockSuperAdminUser);

    await screen.findByText("First Prize Winner");

    const moveDownBtn = screen.getByRole("button", {
      name: 'Move "First Prize Winner" down',
    });
    fireEvent.click(moveDownBtn);

    await waitFor(() => {
      expect(reorderCalled).toBe(true);
    });
  });

  it("preserves focus on logical reorder button after reorder completes", async () => {
    const serverBlocks = [...mockAwardsBlocks];

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({ data: serverBlocks });
      }),
      http.post(
        `${env.apiBaseUrl}/api/v1/admin/spa-sections/:spaSectionId/content-blocks/reorder`,
        () => {
          serverBlocks.reverse();
          return HttpResponse.json({ data: { message: "Reordered" } });
        },
      ),
    );

    renderTestRouter(["/admin/content"]);

    await screen.findByText("First Prize Winner");

    const moveDownBtn = screen.getByRole("button", {
      name: 'Move "First Prize Winner" down',
    });
    fireEvent.click(moveDownBtn);

    await waitFor(() => {
      expect(document.activeElement).not.toBe(document.body);
    });
  });

  /* FRONTEND F7.1 — Canonical Reorder Accessibility + Server-Owned sort_order Hardening */

  describe("F7.1 buildReorderItems helper unit tests", () => {
    it("builds reorder payload assigning canonical 10-step sequence (10, 20, 30) for reordered blocks", () => {
      const currentBlocks = [
        { ...mockAwardsBlocks[0]!, id: BLOCK_IDS.b1, sort_order: 10 },
        { ...mockAwardsBlocks[1]!, id: BLOCK_IDS.b2, sort_order: 30 },
        { ...mockAwardsBlocks[0]!, id: BLOCK_IDS.b3, sort_order: 70 },
      ];

      const reorderedBlocks = [
        currentBlocks[1]!, // b2
        currentBlocks[2]!, // b3
        currentBlocks[0]!, // b1
      ];

      const items = buildReorderItems(currentBlocks, reorderedBlocks);
      expect(items).toEqual([
        { id: BLOCK_IDS.b2, sort_order: 10 },
        { id: BLOCK_IDS.b3, sort_order: 20 },
        { id: BLOCK_IDS.b1, sort_order: 30 },
      ]);
    });

    it("returns null if array length mismatch occurs (invariant failure protection)", () => {
      const currentBlocks = [mockAwardsBlocks[0]!];
      const reorderedBlocks = [mockAwardsBlocks[0]!, mockAwardsBlocks[1]!];

      const items = buildReorderItems(currentBlocks, reorderedBlocks);
      expect(items).toBeNull();
    });
  });

  it("announces canonical position and DOM order on canonical divergence (X Y Z -> move X down -> server refetch Y Z X)", async () => {
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

    const blockZ: AdminContentBlockDto = {
      id: BLOCK_IDS.b3,
      spa_section_id: SECTION_IDS.awards,
      section_key: "awards",
      section_title: "Awards",
      block_type: "text",
      title: "Block Z",
      text: "Content Z",
      media: null,
      sort_order: 30,
      is_visible: true,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };

    let getCount = 0;

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        getCount++;
        if (getCount === 1) {
          // Initial GET returns [X, Y, Z]
          return HttpResponse.json({ data: [blockX, blockY, blockZ] });
        }
        // Refetch after reorder returns canonical order [Y, Z, X]
        return HttpResponse.json({ data: [blockY, blockZ, blockX] });
      }),
      http.post(
        `${env.apiBaseUrl}/api/v1/admin/spa-sections/:spaSectionId/content-blocks/reorder`,
        () => {
          return HttpResponse.json({ data: { message: "Reordered" } });
        },
      ),
    );

    renderTestRouter(["/admin/content"]);

    await screen.findByText("Block X");

    // Click Move Down on Block X (requested local order was [Y, X, Z], but server refetch returns [Y, Z, X])
    const moveDownBtn = screen.getByRole("button", {
      name: 'Move "Block X" down',
    });
    fireEvent.click(moveDownBtn);

    // 1. Verify aria-live announces CANONICAL position 3 of 3 (NOT position 2 of 3)
    await screen.findByText('Moved "Block X" to position 3 of 3.');
    expect(
      screen.queryByText('Moved "Block X" to position 2 of 3.'),
    ).toBeNull();

    // 2. Verify final DOM order matches canonical server refetch [Y, Z, X]
    const cards = screen
      .getAllByRole("heading", { level: 3 })
      .filter((h) => !h.textContent?.startsWith("Error"));
    expect(cards[0]).toHaveTextContent("Block Y");
    expect(cards[1]).toHaveTextContent("Block Z");
    expect(cards[2]).toHaveTextContent("Block X");

    // 3. Verify position badge for X renders Position 3 of 3
    const xCard = cards[2]!.closest("div")!;
    expect(xCard).toHaveTextContent("Position 3 of 3");

    // 4. Verify focus is preserved on usable element (not body)
    expect(document.activeElement).not.toBe(document.body);
  });

  it("reorder refetch preserves unusual server sort_order values (7, 80, 900)", async () => {
    let getCount = 0;

    const blockX = {
      ...mockAwardsBlocks[0]!,
      title: "Block X",
      sort_order: 10,
    };
    const blockY = {
      ...mockAwardsBlocks[1]!,
      title: "Block Y",
      sort_order: 20,
    };
    const blockZ = {
      ...mockAwardsBlocks[0]!,
      id: BLOCK_IDS.b3,
      title: "Block Z",
      sort_order: 30,
    };

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        getCount++;
        if (getCount === 1) {
          return HttpResponse.json({ data: [blockX, blockY, blockZ] });
        }
        // Refetch returns custom unusual server sort_order values [7, 80, 900]
        return HttpResponse.json({
          data: [
            { ...blockY, sort_order: 7 },
            { ...blockZ, sort_order: 80 },
            { ...blockX, sort_order: 900 },
          ],
        });
      }),
      http.post(
        `${env.apiBaseUrl}/api/v1/admin/spa-sections/:spaSectionId/content-blocks/reorder`,
        () => {
          return HttpResponse.json({ data: { message: "Reordered" } });
        },
      ),
    );

    renderTestRouter(["/admin/content"]);

    await screen.findByText("Block X");

    const moveDownBtn = screen.getByRole("button", {
      name: 'Move "Block X" down',
    });
    fireEvent.click(moveDownBtn);

    await screen.findByText('Moved "Block X" to position 3 of 3.');

    expect(screen.getByText("Order: #7")).toBeInTheDocument();
    expect(screen.getByText("Order: #80")).toBeInTheDocument();
    expect(screen.getByText("Order: #900")).toBeInTheDocument();
  });

  it("clears pending announcement on reorder POST error (no stale success announcement)", async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
        return HttpResponse.json({ data: mockSections });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
        return HttpResponse.json({ data: mockAwardsBlocks });
      }),
      http.post(
        `${env.apiBaseUrl}/api/v1/admin/spa-sections/:spaSectionId/content-blocks/reorder`,
        () => {
          return HttpResponse.json(
            {
              error: {
                code: "SERVER_ERROR",
                message: "Reorder internal failure",
              },
            },
            { status: 500 },
          );
        },
      ),
    );

    renderTestRouter(["/admin/content"]);

    await screen.findByText("First Prize Winner");

    const moveDownBtn = screen.getByRole("button", {
      name: 'Move "First Prize Winner" down',
    });
    fireEvent.click(moveDownBtn);

    await waitFor(() => {
      expect(screen.getByText("Reorder internal failure")).toBeInTheDocument();
      expect(screen.queryByText(/Moved "First Prize Winner"/i)).toBeNull();
    });
  });

  /* FRONTEND F7.2 — Canonical Refresh Success/Failure Handshake After Reorder */

  describe("F7.2 Canonical Refresh Handshake", () => {
    it("does not announce position if POST succeeds but canonical GET fails, displaying recoverable refresh error", async () => {
      let postCount = 0;
      let getCount = 0;

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
          // Second GET (post-reorder canonical confirmation) fails with 500
          return HttpResponse.json(
            {
              error: {
                code: "CANONICAL_REFETCH_FAILED",
                message: "Server failed to load fresh section list",
                request_id: "req_get_fail_999",
              },
            },
            { status: 500 },
          );
        }),
        http.post(
          `${env.apiBaseUrl}/api/v1/admin/spa-sections/:spaSectionId/content-blocks/reorder`,
          () => {
            postCount++;
            return HttpResponse.json({ data: { message: "Reordered" } });
          },
        ),
      );

      renderTestRouter(["/admin/content"]);

      await screen.findByText("Block X");

      const moveDownBtn = screen.getByRole("button", {
        name: 'Move "Block X" down',
      });
      fireEvent.click(moveDownBtn);

      await waitFor(() => {
        expect(postCount).toBe(1);
        expect(getCount).toBe(2);
        expect(
          screen.getAllByText(
            "Order was saved, but the latest order could not be loaded.",
          ).length,
        ).toBeGreaterThan(0);
      });

      // 2. Verify request ID is displayed
      expect(
        screen.getByText("Request ID: req_get_fail_999"),
      ).toBeInTheDocument();

      // 3. Verify ZERO position announcement occurred
      expect(screen.queryByText(/Moved "Block X" to position/i)).toBeNull();

      // 4. Verify reorder controls are disabled while in confirmation failure state
      const reorderBtns = screen.getAllByRole("button", { name: /Move /i });
      reorderBtns.forEach((btn) => {
        expect(btn).toBeDisabled();
      });
    });

    it("recovers via Retry performing GET only (0 additional POSTs) and announcing exact canonical position", async () => {
      let postCount = 0;
      let getCount = 0;

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
            // Confirmation GET fails
            return HttpResponse.json(
              {
                error: {
                  code: "GET_FAIL",
                  message: "Temporary load error",
                },
              },
              { status: 500 },
            );
          }
          // Retry GET succeeds with canonical [Block Y, Block X]
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

      renderTestRouter(["/admin/content"]);

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
      });

      // Verify POST count is 1 before Retry
      expect(postCount).toBe(1);

      // Click Retry on error card
      const retryBtn = screen.getByRole("button", { name: "Retry" });
      fireEvent.click(retryBtn);

      // 1. Verify exact position announced after Retry succeeds
      await screen.findByText('Moved "Block X" to position 2 of 2.');

      // 2. Verify POST count REMAINS 1 (0 extra reorder POST requests sent during Retry)
      expect(postCount).toBe(1);

      // 3. Verify GET count is now 3
      expect(getCount).toBe(3);

      // 4. Verify confirmation error card is removed
      expect(
        screen.queryByText(
          "Order was saved, but the latest order could not be loaded.",
        ),
      ).toBeNull();

      // 5. Verify final DOM order reflects canonical list [Block Y, Block X]
      const cards = screen
        .getAllByRole("heading", { level: 3 })
        .filter((h) => !h.textContent?.startsWith("Error"));
      expect(cards[0]).toHaveTextContent("Block Y");
      expect(cards[1]).toHaveTextContent("Block X");
    });
  });

  /* FRONTEND F7.3 — Section-Scoped Canonical Confirmation + Retry Safety */

  describe("F7.3 Section-Scoped Canonical Confirmation + Retry Safety", () => {
    it("locks section selector after canonical GET confirmation failure and prevents section switching while confirmation is unresolved", async () => {
      let postCount = 0;
      let getCount = 0;

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
          return HttpResponse.json(
            {
              error: {
                code: "REFETCH_FAILED",
                message: "Refetch failed",
                request_id: "req_refetch_err",
              },
            },
            { status: 500 },
          );
        }),
        http.post(
          `${env.apiBaseUrl}/api/v1/admin/spa-sections/:spaSectionId/content-blocks/reorder`,
          () => {
            postCount++;
            return HttpResponse.json({ data: { message: "Reordered" } });
          },
        ),
      );

      renderTestRouter(["/admin/content"]);

      await screen.findByText("Block X");

      const sectionSelect = screen.getByLabelText("Select Section:");
      expect(sectionSelect).not.toBeDisabled();

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
      });

      // 1. Assert section selector is disabled while confirmation is unresolved
      expect(sectionSelect).toBeDisabled();

      // 2. Assert reorder buttons are disabled and clicking them does NOT send duplicate reorder POST
      const moveBtns = screen.getAllByRole("button", { name: /Move /i });
      moveBtns.forEach((btn) => expect(btn).toBeDisabled());
      expect(postCount).toBe(1);

      // 3. Assert request ID is preserved
      expect(
        screen.getByText("Request ID: req_refetch_err"),
      ).toBeInTheDocument();
    });

    it("keeps section selector locked when Retry GET fails again", async () => {
      let postCount = 0;
      let getCount = 0;

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
          // All subsequent GETs fail
          return HttpResponse.json(
            {
              error: {
                code: "RETRY_GET_FAIL",
                message: "Retry GET server failure",
                request_id: "req_retry_fail",
              },
            },
            { status: 500 },
          );
        }),
        http.post(
          `${env.apiBaseUrl}/api/v1/admin/spa-sections/:spaSectionId/content-blocks/reorder`,
          () => {
            postCount++;
            return HttpResponse.json({ data: { message: "Reordered" } });
          },
        ),
      );

      renderTestRouter(["/admin/content"]);

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
      });

      const sectionSelect = screen.getByLabelText("Select Section:");
      expect(sectionSelect).toBeDisabled();

      const retryBtn = screen.getByRole("button", { name: "Retry" });
      fireEvent.click(retryBtn);

      await waitFor(() => {
        expect(getCount).toBe(3);
      });

      // 1. Selector remains disabled
      expect(sectionSelect).toBeDisabled();

      // 2. Retry remains available
      expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();

      // 3. POST count remains 1
      expect(postCount).toBe(1);

      // 4. Zero position announcement
      expect(screen.queryByText(/Moved "Block X" to position/i)).toBeNull();
    });

    it("unlocks section selector after Retry GET succeeds, allowing clean section switching", async () => {
      let postCount = 0;
      let getCount = 0;

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

      const partnerBlock: AdminContentBlockDto = {
        id: BLOCK_IDS.b3,
        spa_section_id: SECTION_IDS.partners,
        section_key: "partners",
        section_title: "Partners",
        block_type: "text",
        title: "Partner Sponsor Alpha",
        text: "Sponsor info",
        media: null,
        sort_order: 10,
        is_visible: true,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      };

      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
          return HttpResponse.json({ data: mockSections });
        }),
        http.get(
          `${env.apiBaseUrl}/api/v1/admin/content-blocks`,
          ({ request }) => {
            const url = new URL(request.url);
            const secId = url.searchParams.get("spa_section_id");
            if (secId === SECTION_IDS.partners) {
              return HttpResponse.json({ data: [partnerBlock] });
            }

            getCount++;
            if (getCount === 1) {
              return HttpResponse.json({ data: [blockX, blockY] });
            }
            if (getCount === 2) {
              return HttpResponse.json(
                { error: { code: "FAIL", message: "Fail" } },
                { status: 500 },
              );
            }
            return HttpResponse.json({ data: [blockY, blockX] });
          },
        ),
        http.post(
          `${env.apiBaseUrl}/api/v1/admin/spa-sections/:spaSectionId/content-blocks/reorder`,
          () => {
            postCount++;
            return HttpResponse.json({ data: { message: "Reordered" } });
          },
        ),
      );

      renderTestRouter(["/admin/content"]);

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
      });

      const sectionSelect = screen.getByLabelText("Select Section:");
      expect(sectionSelect).toBeDisabled();

      const retryBtn = screen.getByRole("button", { name: "Retry" });
      fireEvent.click(retryBtn);

      await screen.findByText('Moved "Block X" to position 2 of 2.');

      // 1. POST count remains 1
      expect(postCount).toBe(1);

      // 2. Selector is now unlocked
      expect(sectionSelect).not.toBeDisabled();

      // 3. Switch section to Partners
      fireEvent.change(sectionSelect, {
        target: { value: SECTION_IDS.partners },
      });

      // 4. Verify Partners block loads without cross-section contamination
      await screen.findByText("Partner Sponsor Alpha");
      expect(screen.queryByText("Block X")).toBeNull();
    });
  });
});
