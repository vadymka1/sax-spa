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
import { PageAppearancePage } from "../features/admin/appearance/PageAppearancePage";
import { PublicPage } from "../features/public-page/PublicPage";
import {
  AdminImageMedia,
  AdminPageAppearanceDto,
  AdminPageAppearanceDtoSchema,
  PublicPageResponse,
} from "../api/types";
import { apiClient } from "../api/client";

const mockAdminUser = {
  id: "10000000-0000-4000-8000-000000000001",
  email: "admin@example.test",
  display_name: "Admin User",
  role: "admin" as const,
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const defaultAppearanceDto: AdminPageAppearanceDto = {
  background_media: null,
  overlay_opacity: 0.35,
  background_position: "center",
  background_size: "cover",
};

const existingAppearanceDto: AdminPageAppearanceDto = {
  background_media: {
    id: "99999999-9999-4999-8999-999999999999",
    type: "image",
    url: "https://api.enstisax.com/uploads/bg-sample.jpg",
    alt_text: null,
  },
  overlay_opacity: 0.5,
  background_position: "top",
  background_size: "contain",
};

function renderAdminRouter(initialEntries = ["/admin/page-appearance"]) {
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
                path: "page-appearance",
                element: <PageAppearancePage />,
              },
            ],
          },
        ],
      },
    ],
    { initialEntries },
  );

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={testRouter} />
        </AuthProvider>
      </QueryClientProvider>,
    ),
    queryClient,
  };
}

function renderPublicView() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        retryDelay: 0,
        staleTime: 0,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <PublicPage />
    </QueryClientProvider>,
  );
}

describe("Page Appearance Feature V1", () => {
  const originalAdapter = apiClient.defaults.adapter;

  beforeEach(() => {
    apiClient.defaults.adapter = "fetch";
    authSession.setAccessToken("valid-access-token");
    authSession.resetCheckedState();
    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/auth/me`, () => {
        return HttpResponse.json({ data: mockAdminUser });
      }),
      http.get(
        `${env.apiBaseUrl}/api/v1/admin/contact-messages/unread-count`,
        () => {
          return HttpResponse.json({ data: { unread_count: 0 } });
        },
      ),
    );
  });

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter;
    authSession.clearSession();
    authSession.resetCheckedState();
    vi.restoreAllMocks();
  });

  describe("Schema Validation", () => {
    it("validates default and configured AdminPageAppearanceDto against Zod schema", () => {
      expect(() =>
        AdminPageAppearanceDtoSchema.parse(defaultAppearanceDto),
      ).not.toThrow();
      expect(() =>
        AdminPageAppearanceDtoSchema.parse(existingAppearanceDto),
      ).not.toThrow();
    });

    it("Section 11 & 12: parses valid image with type: 'image' and null background", () => {
      const validImageAppearance = {
        background_media: {
          id: "99999999-9999-4999-8999-999999999999",
          type: "image",
          url: "https://api.enstisax.com/uploads/bg.webp",
          alt_text: "Background",
        },
        overlay_opacity: 0.35,
        background_position: "center",
        background_size: "cover",
      };
      expect(() =>
        AdminPageAppearanceDtoSchema.parse(validImageAppearance),
      ).not.toThrow();

      const nullBackground = {
        background_media: null,
        overlay_opacity: 0.35,
        background_position: "center",
        background_size: "cover",
      };
      expect(() =>
        AdminPageAppearanceDtoSchema.parse(nullBackground),
      ).not.toThrow();
    });

    it("Section 13: rejects background_media with missing discriminator", () => {
      const missingDiscriminator = {
        background_media: {
          id: "99999999-9999-4999-8999-999999999999",
          url: "https://api.enstisax.com/uploads/bg.webp",
        },
        overlay_opacity: 0.35,
        background_position: "center",
        background_size: "cover",
      };
      expect(() =>
        AdminPageAppearanceDtoSchema.parse(missingDiscriminator),
      ).toThrow();
    });

    it("Section 14: rejects background_media with non-image discriminator (video, youtube)", () => {
      const videoDiscriminator = {
        background_media: {
          id: "99999999-9999-4999-8999-999999999999",
          type: "video",
          url: "https://api.enstisax.com/uploads/bg.mp4",
        },
        overlay_opacity: 0.35,
        background_position: "center",
        background_size: "cover",
      };
      expect(() =>
        AdminPageAppearanceDtoSchema.parse(videoDiscriminator),
      ).toThrow();

      const youtubeDiscriminator = {
        background_media: {
          id: "99999999-9999-4999-8999-999999999999",
          type: "youtube",
          url: "https://www.youtube.com/watch?v=123",
        },
        overlay_opacity: 0.35,
        background_position: "center",
        background_size: "cover",
      };
      expect(() =>
        AdminPageAppearanceDtoSchema.parse(youtubeDiscriminator),
      ).toThrow();
    });

    it("Section 15: rejects legacy media_type shape without type: 'image'", () => {
      const legacyMediaType = {
        background_media: {
          id: "99999999-9999-4999-8999-999999999999",
          media_type: "image",
          url: "https://api.enstisax.com/uploads/bg.webp",
        },
        overlay_opacity: 0.35,
        background_position: "center",
        background_size: "cover",
      };
      expect(() =>
        AdminPageAppearanceDtoSchema.parse(legacyMediaType),
      ).toThrow();
    });
  });

  describe("Admin Appearance UI — Initial Load & Controls", () => {
    it("loads default settings (null background, 35% opacity, center, cover)", async () => {
      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/admin/page-appearance`, () => {
          return HttpResponse.json({ data: defaultAppearanceDto });
        }),
      );

      renderAdminRouter();

      expect(
        await screen.findByTestId("appearance-no-image"),
      ).toHaveTextContent("No background image configured");

      expect(
        screen.queryByTestId("appearance-current-image"),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Upload Background Image" }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Remove Background" }),
      ).not.toBeInTheDocument();

      const slider = screen.getByTestId(
        "appearance-opacity-slider",
      ) as HTMLInputElement;
      expect(slider.value).toBe("35");
      expect(screen.getByTestId("appearance-opacity-badge")).toHaveTextContent(
        "35%",
      );

      const centerRadio = screen.getByTestId("appearance-position-center");
      expect(centerRadio).toHaveAttribute("aria-checked", "true");

      const coverRadio = screen.getByTestId("appearance-size-cover");
      expect(coverRadio).toHaveAttribute("aria-checked", "true");

      // Save button disabled when pristine
      const saveButton = screen.getByTestId("appearance-save-button");
      expect(saveButton).toBeDisabled();
    });

    it("loads configured background image with custom position and size", async () => {
      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/admin/page-appearance`, () => {
          return HttpResponse.json({ data: existingAppearanceDto });
        }),
      );

      renderAdminRouter();

      const thumbnail = (await screen.findByTestId(
        "appearance-current-image",
      )) as HTMLImageElement;
      expect(thumbnail.src).toBe(existingAppearanceDto.background_media?.url);

      expect(
        screen.getByRole("button", { name: "Replace Image" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Remove Background" }),
      ).toBeInTheDocument();

      const slider = screen.getByTestId(
        "appearance-opacity-slider",
      ) as HTMLInputElement;
      expect(slider.value).toBe("50");
      expect(screen.getByTestId("appearance-opacity-badge")).toHaveTextContent(
        "50%",
      );

      const topRadio = screen.getByTestId("appearance-position-top");
      expect(topRadio).toHaveAttribute("aria-checked", "true");

      const containRadio = screen.getByTestId("appearance-size-contain");
      expect(containRadio).toHaveAttribute("aria-checked", "true");

      // Live preview element matches loaded styles
      const livePreview = screen.getByTestId("appearance-live-preview");
      expect(livePreview.style.backgroundImage).toContain(
        "https://api.enstisax.com/uploads/bg-sample.jpg",
      );
      expect(livePreview.style.backgroundPosition).toBe("top");
      expect(livePreview.style.backgroundSize).toBe("contain");

      const previewOverlay = screen.getByTestId("appearance-preview-overlay");
      expect(previewOverlay.style.opacity).toBe("0.5");
    });
  });

  describe("Admin Image Upload & Removal Flows", () => {
    it("uploads image via media upload API and immediately PATCHes background_media_id", async () => {
      let uploadCalled = false;
      let patchPayload: unknown = null;

      const uploadedMedia: AdminImageMedia = {
        type: "image",
        id: "12345678-1234-4234-8234-123456789abc",
        url: "https://api.enstisax.com/uploads/new-bg.webp",
        original_filename: "photo.webp",
        mime_type: "image/webp",
        file_size: 2048,
        created_at: "2026-01-01T00:00:00Z",
      };

      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/admin/page-appearance`, () => {
          return HttpResponse.json({ data: defaultAppearanceDto });
        }),
        http.post(`${env.apiBaseUrl}/api/v1/admin/media/upload`, () => {
          uploadCalled = true;
          return HttpResponse.json({ data: uploadedMedia }, { status: 201 });
        }),
        http.patch(
          `${env.apiBaseUrl}/api/v1/admin/page-appearance`,
          async ({ request }) => {
            patchPayload = await request.json();
            return HttpResponse.json({
              data: {
                ...defaultAppearanceDto,
                background_media: {
                  id: uploadedMedia.id,
                  type: "image",
                  url: uploadedMedia.url,
                },
              },
            });
          },
        ),
      );

      renderAdminRouter();

      await screen.findByTestId("appearance-no-image");

      const fileInput = screen.getByTestId("appearance-file-input");
      const file = new File(["dummy content"], "photo.webp", {
        type: "image/webp",
      });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(uploadCalled).toBe(true);
      });

      await waitFor(() => {
        expect(patchPayload).toEqual({
          background_media_id: uploadedMedia.id,
        });
      });

      await waitFor(() => {
        expect(
          screen.getByText(/Appearance settings saved successfully/i),
        ).toBeInTheDocument();
      });
    });

    it("rejects non-image files before calling media upload API", async () => {
      let uploadCalled = false;

      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/admin/page-appearance`, () => {
          return HttpResponse.json({ data: defaultAppearanceDto });
        }),
        http.post(`${env.apiBaseUrl}/api/v1/admin/media/upload`, () => {
          uploadCalled = true;
          return HttpResponse.json({}, { status: 201 });
        }),
      );

      renderAdminRouter();

      await screen.findByTestId("appearance-no-image");

      const fileInput = screen.getByTestId("appearance-file-input");
      const pdfFile = new File(["pdf content"], "document.pdf", {
        type: "application/pdf",
      });

      fireEvent.change(fileInput, { target: { files: [pdfFile] } });

      expect(
        await screen.findByText(
          /Invalid file type. Please select a JPEG, PNG, or WebP image/i,
        ),
      ).toBeInTheDocument();
      expect(uploadCalled).toBe(false);
    });

    it("handles media upload failure without calling appearance PATCH", async () => {
      let patchCalled = false;

      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/admin/page-appearance`, () => {
          return HttpResponse.json({ data: defaultAppearanceDto });
        }),
        http.post(`${env.apiBaseUrl}/api/v1/admin/media/upload`, () => {
          return HttpResponse.json(
            {
              error: {
                code: "INTERNAL_ERROR",
                message: "Storage quota exceeded",
              },
            },
            { status: 500 },
          );
        }),
        http.patch(`${env.apiBaseUrl}/api/v1/admin/page-appearance`, () => {
          patchCalled = true;
          return HttpResponse.json({ data: defaultAppearanceDto });
        }),
      );

      renderAdminRouter();

      await screen.findByTestId("appearance-no-image");

      const fileInput = screen.getByTestId("appearance-file-input");
      const file = new File(["dummy content"], "photo.png", {
        type: "image/png",
      });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/Storage quota exceeded/i)).toBeInTheDocument();
      });

      expect(patchCalled).toBe(false);
      expect(screen.getByTestId("appearance-no-image")).toBeInTheDocument();
    });

    it("handles PATCH failure after successful image upload", async () => {
      const uploadedMedia: AdminImageMedia = {
        type: "image",
        id: "12345678-1234-4234-8234-123456789abc",
        url: "https://api.enstisax.com/uploads/new-bg.webp",
        original_filename: "photo.jpg",
        mime_type: "image/jpeg",
        file_size: 2048,
        created_at: "2026-01-01T00:00:00Z",
      };

      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/admin/page-appearance`, () => {
          return HttpResponse.json({ data: defaultAppearanceDto });
        }),
        http.post(`${env.apiBaseUrl}/api/v1/admin/media/upload`, () => {
          return HttpResponse.json({ data: uploadedMedia }, { status: 201 });
        }),
        http.patch(`${env.apiBaseUrl}/api/v1/admin/page-appearance`, () => {
          return HttpResponse.json(
            {
              error: {
                code: "INTERNAL_ERROR",
                message: "Database connection failed",
              },
            },
            { status: 500 },
          );
        }),
      );

      renderAdminRouter();

      await screen.findByTestId("appearance-no-image");

      const fileInput = screen.getByTestId("appearance-file-input");
      const file = new File(["dummy content"], "photo.jpg", {
        type: "image/jpeg",
      });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(
          screen.getByText(/Database connection failed/i),
        ).toBeInTheDocument();
      });

      expect(
        screen.queryByText(/Appearance settings saved successfully/i),
      ).not.toBeInTheDocument();
    });

    it("removes background image sending background_media_id: null", async () => {
      let patchPayload: unknown = null;
      let currentAppearance = { ...existingAppearanceDto };

      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/admin/page-appearance`, () => {
          return HttpResponse.json({ data: currentAppearance });
        }),
        http.patch(
          `${env.apiBaseUrl}/api/v1/admin/page-appearance`,
          async ({ request }) => {
            patchPayload = await request.json();
            currentAppearance = {
              ...currentAppearance,
              background_media: null,
            };
            return HttpResponse.json({
              data: currentAppearance,
            });
          },
        ),
      );

      renderAdminRouter();

      await screen.findByTestId("appearance-current-image");

      const removeBtn = screen.getByRole("button", {
        name: "Remove Background",
      });
      fireEvent.click(removeBtn);

      await waitFor(() => {
        expect(patchPayload).toEqual({
          background_media_id: null,
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId("appearance-no-image")).toBeInTheDocument();
      });
    });
  });

  describe("Overlay, Position, Size Controls & Partial PATCH", () => {
    it("updates overlay slider and sends partial PATCH { overlay_opacity: 0.6 }", async () => {
      let patchPayload: unknown = null;

      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/admin/page-appearance`, () => {
          return HttpResponse.json({ data: defaultAppearanceDto });
        }),
        http.patch(
          `${env.apiBaseUrl}/api/v1/admin/page-appearance`,
          async ({ request }) => {
            patchPayload = await request.json();
            return HttpResponse.json({
              data: {
                ...defaultAppearanceDto,
                overlay_opacity: 0.6,
              },
            });
          },
        ),
      );

      renderAdminRouter();

      await screen.findByTestId("appearance-no-image");

      const slider = screen.getByTestId("appearance-opacity-slider");
      fireEvent.change(slider, { target: { value: "60" } });

      expect(screen.getByTestId("appearance-opacity-badge")).toHaveTextContent(
        "60%",
      );

      // Live preview overlay immediately updates before saving
      const previewOverlay = screen.getByTestId("appearance-preview-overlay");
      expect(previewOverlay.style.opacity).toBe("0.6");

      const saveBtn = screen.getByTestId("appearance-save-button");
      expect(saveBtn).toBeEnabled();
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(patchPayload).toEqual({
          overlay_opacity: 0.6,
        });
      });

      await waitFor(() => {
        expect(
          screen.getByText(/Appearance settings saved successfully/i),
        ).toBeInTheDocument();
      });
    });

    it("changes position to top and sends partial PATCH { background_position: 'top' }", async () => {
      let patchPayload: unknown = null;

      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/admin/page-appearance`, () => {
          return HttpResponse.json({ data: defaultAppearanceDto });
        }),
        http.patch(
          `${env.apiBaseUrl}/api/v1/admin/page-appearance`,
          async ({ request }) => {
            patchPayload = await request.json();
            return HttpResponse.json({
              data: {
                ...defaultAppearanceDto,
                background_position: "top",
              },
            });
          },
        ),
      );

      renderAdminRouter();

      await screen.findByTestId("appearance-no-image");

      const topRadio = screen.getByTestId("appearance-position-top");
      fireEvent.click(topRadio);

      // Live preview immediately reflects top
      const livePreview = screen.getByTestId("appearance-live-preview");
      expect(livePreview.style.backgroundPosition).toBe("top");

      const saveBtn = screen.getByTestId("appearance-save-button");
      expect(saveBtn).toBeEnabled();
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(patchPayload).toEqual({
          background_position: "top",
        });
      });
    });

    it("changes size to contain and sends partial PATCH { background_size: 'contain' }", async () => {
      let patchPayload: unknown = null;

      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/admin/page-appearance`, () => {
          return HttpResponse.json({ data: defaultAppearanceDto });
        }),
        http.patch(
          `${env.apiBaseUrl}/api/v1/admin/page-appearance`,
          async ({ request }) => {
            patchPayload = await request.json();
            return HttpResponse.json({
              data: {
                ...defaultAppearanceDto,
                background_size: "contain",
              },
            });
          },
        ),
      );

      renderAdminRouter();

      await screen.findByTestId("appearance-no-image");

      const containRadio = screen.getByTestId("appearance-size-contain");
      fireEvent.click(containRadio);

      // Live preview immediately reflects contain
      const livePreview = screen.getByTestId("appearance-live-preview");
      expect(livePreview.style.backgroundSize).toBe("contain");

      const saveBtn = screen.getByTestId("appearance-save-button");
      expect(saveBtn).toBeEnabled();
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(patchPayload).toEqual({
          background_size: "contain",
        });
      });
    });

    it("tests live preview reacts immediately to position buttons (top, bottom, center)", async () => {
      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/admin/page-appearance`, () => {
          return HttpResponse.json({ data: existingAppearanceDto });
        }),
      );

      renderAdminRouter();

      await screen.findByTestId("appearance-current-image");

      const livePreview = screen.getByTestId("appearance-live-preview");

      // Initially top from existingAppearanceDto
      expect(livePreview.style.backgroundPosition).toBe("top");

      // Click Bottom
      fireEvent.click(screen.getByTestId("appearance-position-bottom"));
      expect(livePreview.style.backgroundPosition).toBe("bottom");

      // Click Center
      fireEvent.click(screen.getByTestId("appearance-position-center"));
      expect(livePreview.style.backgroundPosition).toBe("center");
    });
  });

  describe("Public Page Appearance Rendering", () => {
    const basePublicPage: PublicPageResponse = {
      page: {
        id: "813876e5-42d8-4fbb-91ea-72223a3bc990",
        slug: "home",
        title: "Saxophone Ensemble",
        seo_title: "Saxophone Ensemble",
      },
      appearance: {
        background_media: null,
        overlay_opacity: 0.35,
        background_position: "center",
        background_size: "cover",
      },
      sections: [
        {
          id: "e0b9687e-e2e4-4d8b-9a84-9343ee6df322",
          key: "about-us",
          title: "About Us",
          navigation_label: "About Us",
          sort_order: 10,
          blocks: [],
        },
      ],
      testimonials: [],
    };

    it("renders default layout without background styles or overlay when background_media is null", async () => {
      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/public/page`, () => {
          return HttpResponse.json({ data: basePublicPage });
        }),
      );

      renderPublicView();

      expect(
        await screen.findByRole("heading", { name: "About Us" }),
      ).toBeInTheDocument();

      const wrapper = screen.getByTestId("public-page-wrapper");
      expect(wrapper.style.backgroundImage).toBe("");

      expect(
        screen.queryByTestId("public-page-overlay"),
      ).not.toBeInTheDocument();
    });

    it("renders background image, position, size, and overlay when configured", async () => {
      const publicWithBackground: PublicPageResponse = {
        ...basePublicPage,
        appearance: {
          background_media: {
            id: "99999999-9999-4999-8999-999999999999",
            type: "image",
            url: "https://api.enstisax.com/uploads/bg-hero.webp",
          },
          overlay_opacity: 0.4,
          background_position: "top",
          background_size: "cover",
        },
      };

      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/public/page`, () => {
          return HttpResponse.json({ data: publicWithBackground });
        }),
      );

      renderPublicView();

      expect(
        await screen.findByRole("heading", { name: "About Us" }),
      ).toBeInTheDocument();

      const wrapper = screen.getByTestId("public-page-wrapper");
      expect(wrapper.style.backgroundImage).toContain(
        "https://api.enstisax.com/uploads/bg-hero.webp",
      );
      expect(wrapper.style.backgroundPosition).toBe("top");
      expect(wrapper.style.backgroundSize).toBe("cover");

      const overlay = screen.getByTestId("public-page-overlay");
      expect(overlay.style.opacity).toBe("0.4");
    });

    it("maintains identical appearance settings when switching between English and German", async () => {
      const enData: PublicPageResponse = {
        ...basePublicPage,
        page: {
          ...basePublicPage.page,
          title: "Saxophone Ensemble",
        },
        appearance: {
          background_media: {
            id: "99999999-9999-4999-8999-999999999999",
            type: "image",
            url: "https://api.enstisax.com/uploads/bg-hero.webp",
          },
          overlay_opacity: 0.45,
          background_position: "center",
          background_size: "cover",
        },
      };

      const deData: PublicPageResponse = {
        ...basePublicPage,
        page: {
          ...basePublicPage.page,
          title: "Saxophon-Ensemble",
        },
        appearance: enData.appearance,
      };

      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/public/page`, ({ request }) => {
          const url = new URL(request.url);
          const loc = url.searchParams.get("locale");
          if (loc === "de") {
            return HttpResponse.json({ data: deData });
          }
          return HttpResponse.json({ data: enData });
        }),
      );

      renderPublicView();

      expect(
        await screen.findByRole("heading", { name: "About Us" }),
      ).toBeInTheDocument();

      const wrapper = screen.getByTestId("public-page-wrapper");
      expect(wrapper.style.backgroundImage).toContain(
        "https://api.enstisax.com/uploads/bg-hero.webp",
      );

      // Switch language to German
      const [deButton] = screen.getAllByTestId("lang-switch-de");
      expect(deButton).toBeDefined();
      if (!deButton) throw new Error("DE button not found");
      fireEvent.click(deButton);

      await screen.findByText("Saxophon-Ensemble");

      // Verify appearance remains identical
      expect(wrapper.style.backgroundImage).toContain(
        "https://api.enstisax.com/uploads/bg-hero.webp",
      );
      expect(wrapper.style.backgroundPosition).toBe("center");
      expect(wrapper.style.backgroundSize).toBe("cover");

      const overlay = screen.getByTestId("public-page-overlay");
      expect(overlay.style.opacity).toBe("0.45");
    });
  });

  describe("Admin Navigation & Auth V3 Direct Route", () => {
    it("renders page appearance directly at /admin/page-appearance with valid auth token", async () => {
      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/admin/page-appearance`, () => {
          return HttpResponse.json({ data: defaultAppearanceDto });
        }),
      );

      renderAdminRouter(["/admin/page-appearance"]);

      expect(
        await screen.findByTestId("appearance-no-image"),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "Page Appearance" }),
      ).toBeInTheDocument();
    });
  });
});
