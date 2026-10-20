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
  AdminImageMediaSchema,
  AdminPageAppearanceDto,
  AdminPageAppearanceDtoSchema,
  PublicPageAppearanceMediaSchema,
  PublicPageAppearanceDtoSchema,
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
  background_mode: "none",
  background_color: "#FFFFFF",
  background_media: null,
  overlay_opacity: 0.35,
  background_position: "center",
  background_size: "cover",
};

const colorAppearanceDto: AdminPageAppearanceDto = {
  background_mode: "color",
  background_color: "#F4EFE8",
  background_media: null,
  overlay_opacity: 0.35,
  background_position: "center",
  background_size: "cover",
};

const existingAppearanceDto: AdminPageAppearanceDto = {
  background_mode: "image",
  background_color: "#F4EFE8",
  background_media: {
    id: "99999999-9999-4999-8999-999999999999",
    type: "image",
    url: "https://api.enstisax.com/uploads/bg-sample.jpg",
    original_filename: "bg-sample.jpg",
    mime_type: "image/jpeg",
    file_size: 123456,
    alt_text: null,
    created_at: "2026-10-20T12:00:00Z",
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

describe("Page Appearance Feature V1.2 — Background Mode and Solid Color", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    authSession.setAccessToken("mock-admin-token");
    authSession.resetCheckedState();
    apiClient.defaults.headers.common["Authorization"] =
      "Bearer mock-admin-token";

    // Standard MSW handlers
    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/auth/me`, () => {
        return HttpResponse.json({ data: mockAdminUser });
      }),
      http.post(`${env.apiBaseUrl}/api/v1/auth/refresh`, () => {
        return HttpResponse.json({
          data: {
            user: mockAdminUser,
            access_token: "mock-admin-token",
          },
        });
      }),
    );
  });

  afterEach(() => {
    authSession.clearSession();
    delete apiClient.defaults.headers.common["Authorization"];
    vi.restoreAllMocks();
  });

  describe("Appearance DTO Schema Validation", () => {
    it("parses valid default appearance DTO and image appearance DTO", () => {
      expect(() =>
        AdminPageAppearanceDtoSchema.parse(defaultAppearanceDto),
      ).not.toThrow();
      expect(() =>
        AdminPageAppearanceDtoSchema.parse(existingAppearanceDto),
      ).not.toThrow();
    });

    it("Section 14: parses valid realistic full admin background media payload", () => {
      const realisticAdminPayload = {
        background_mode: "image" as const,
        background_color: "#F4EFE8",
        background_media: {
          id: "99999999-9999-4999-8999-999999999999",
          type: "image" as const,
          url: "http://localhost:8000/uploads/background.jpg",
          original_filename: "background.jpg",
          mime_type: "image/jpeg",
          file_size: 123456,
          alt_text: null,
          created_at: "2026-10-20T12:00:00Z",
        },
        overlay_opacity: 0.5,
        background_position: "top" as const,
        background_size: "contain" as const,
      };

      expect(() =>
        AdminImageMediaSchema.parse(realisticAdminPayload.background_media),
      ).not.toThrow();

      const parsed = AdminPageAppearanceDtoSchema.parse(realisticAdminPayload);
      expect(parsed.background_media?.id).toBe(
        "99999999-9999-4999-8999-999999999999",
      );
      expect(parsed.background_media?.type).toBe("image");
      expect(parsed.background_media?.url).toBe(
        "http://localhost:8000/uploads/background.jpg",
      );
      expect(parsed.background_media?.original_filename).toBe("background.jpg");
      expect(parsed.background_media?.mime_type).toBe("image/jpeg");
      expect(parsed.background_media?.file_size).toBe(123456);
      expect(parsed.background_media?.created_at).toBe("2026-10-20T12:00:00Z");
    });

    it("Section 18: public compact media remains valid under PublicPageAppearanceDtoSchema", () => {
      const compactPublicMedia = {
        id: "99999999-9999-4999-8999-999999999999",
        type: "image" as const,
        url: "https://api.enstisax.com/uploads/bg.webp",
        alt_text: null,
      };

      const parsedMedia =
        PublicPageAppearanceMediaSchema.parse(compactPublicMedia);
      expect(parsedMedia.id).toBe("99999999-9999-4999-8999-999999999999");
      expect(parsedMedia.type).toBe("image");

      const publicAppearance = {
        background_mode: "image" as const,
        background_color: "#FFFFFF",
        background_media: compactPublicMedia,
        overlay_opacity: 0.35,
        background_position: "center" as const,
        background_size: "cover" as const,
      };

      const parsedAppearance =
        PublicPageAppearanceDtoSchema.parse(publicAppearance);
      expect(parsedAppearance.background_media?.url).toBe(
        "https://api.enstisax.com/uploads/bg.webp",
      );
    });

    it("Section 19: public appearance schema strictly rejects admin-only fields", () => {
      const publicWithAdminFields = {
        id: "99999999-9999-4999-8999-999999999999",
        type: "image" as const,
        url: "https://api.enstisax.com/uploads/bg.webp",
        alt_text: null,
        original_filename: "background.jpg",
        mime_type: "image/jpeg",
        file_size: 123456,
        created_at: "2026-10-20T12:00:00Z",
      };

      expect(() =>
        PublicPageAppearanceMediaSchema.parse(publicWithAdminFields),
      ).toThrow();

      expect(() =>
        PublicPageAppearanceDtoSchema.parse({
          background_mode: "image",
          background_color: "#FFFFFF",
          background_media: publicWithAdminFields,
          overlay_opacity: 0.35,
          background_position: "center",
          background_size: "cover",
        }),
      ).toThrow();
    });

    it("Section 20: admin appearance schema strictly rejects media missing required fields", () => {
      // Missing mime_type
      expect(() =>
        AdminPageAppearanceDtoSchema.parse({
          background_mode: "image",
          background_color: "#FFFFFF",
          background_media: {
            id: "99999999-9999-4999-8999-999999999999",
            type: "image",
            url: "https://api.enstisax.com/uploads/bg.webp",
            original_filename: "bg.webp",
            file_size: 123456,
            created_at: "2026-10-20T12:00:00Z",
          },
          overlay_opacity: 0.35,
          background_position: "center",
          background_size: "cover",
        }),
      ).toThrow();

      // Missing file_size
      expect(() =>
        AdminPageAppearanceDtoSchema.parse({
          background_mode: "image",
          background_color: "#FFFFFF",
          background_media: {
            id: "99999999-9999-4999-8999-999999999999",
            type: "image",
            url: "https://api.enstisax.com/uploads/bg.webp",
            original_filename: "bg.webp",
            mime_type: "image/jpeg",
            created_at: "2026-10-20T12:00:00Z",
          },
          overlay_opacity: 0.35,
          background_position: "center",
          background_size: "cover",
        }),
      ).toThrow();

      // Missing created_at
      expect(() =>
        AdminPageAppearanceDtoSchema.parse({
          background_mode: "image",
          background_color: "#FFFFFF",
          background_media: {
            id: "99999999-9999-4999-8999-999999999999",
            type: "image",
            url: "https://api.enstisax.com/uploads/bg.webp",
            original_filename: "bg.webp",
            mime_type: "image/jpeg",
            file_size: 123456,
          },
          overlay_opacity: 0.35,
          background_position: "center",
          background_size: "cover",
        }),
      ).toThrow();
    });

    it("Section 22: both Admin and Public schemas continue accepting background_media = null", () => {
      const nullAdmin = {
        background_mode: "none" as const,
        background_color: "#FFFFFF",
        background_media: null,
        overlay_opacity: 0.35,
        background_position: "center" as const,
        background_size: "cover" as const,
      };
      expect(() => AdminPageAppearanceDtoSchema.parse(nullAdmin)).not.toThrow();

      const nullPublic = {
        background_mode: "none" as const,
        background_color: "#FFFFFF",
        background_media: null,
        overlay_opacity: 0.35,
        background_position: "center" as const,
        background_size: "cover" as const,
      };
      expect(() =>
        PublicPageAppearanceDtoSchema.parse(nullPublic),
      ).not.toThrow();
    });

    it("rejects background_media with missing discriminator", () => {
      const missingDiscriminator = {
        background_mode: "image",
        background_color: "#FFFFFF",
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

    it("rejects background_media with non-image discriminator (video, youtube)", () => {
      const videoDiscriminator = {
        background_mode: "image",
        background_color: "#FFFFFF",
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
        background_mode: "image",
        background_color: "#FFFFFF",
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

    it("rejects legacy media_type shape without type: 'image'", () => {
      const legacyMediaType = {
        background_mode: "image",
        background_color: "#FFFFFF",
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

    it("Section 45: validates canonical BackgroundColor and rejects invalid hex strings", () => {
      for (const validColor of ["#FFFFFF", "#F4EFE8", "#000000"]) {
        expect(() =>
          AdminPageAppearanceDtoSchema.parse({
            background_mode: "color",
            background_color: validColor,
            background_media: null,
            overlay_opacity: 0.35,
            background_position: "center",
            background_size: "cover",
          }),
        ).not.toThrow();
      }

      for (const invalidColor of ["#fff", "FFFFFF", "red", "#12345G", ""]) {
        expect(() =>
          AdminPageAppearanceDtoSchema.parse({
            background_mode: "color",
            background_color: invalidColor,
            background_media: null,
            overlay_opacity: 0.35,
            background_position: "center",
            background_size: "cover",
          }),
        ).toThrow();
      }
    });

    it("validates BackgroundMode enum values (none, color, image) and rejects invalid modes", () => {
      for (const mode of ["none", "color", "image"] as const) {
        expect(() =>
          AdminPageAppearanceDtoSchema.parse({
            background_mode: mode,
            background_color: "#FFFFFF",
            background_media: null,
            overlay_opacity: 0.35,
            background_position: "center",
            background_size: "cover",
          }),
        ).not.toThrow();
      }

      expect(() =>
        AdminPageAppearanceDtoSchema.parse({
          background_mode: "pattern",
          background_color: "#FFFFFF",
          background_media: null,
          overlay_opacity: 0.35,
          background_position: "center",
          background_size: "cover",
        }),
      ).toThrow();
    });
  });

  describe("Admin Appearance UI — Initial Load & Controls", () => {
    it("Section 46: loads default settings (none mode, #FFFFFF, null background)", async () => {
      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/admin/page-appearance`, () => {
          return HttpResponse.json({ data: defaultAppearanceDto });
        }),
      );

      renderAdminRouter();

      expect(await screen.findByTestId("appearance-mode-none")).toHaveAttribute(
        "aria-checked",
        "true",
      );
      expect(screen.getByTestId("appearance-mode-color")).toHaveAttribute(
        "aria-checked",
        "false",
      );
      expect(screen.getByTestId("appearance-mode-image")).toHaveAttribute(
        "aria-checked",
        "false",
      );

      const colorInput = screen.getByTestId(
        "appearance-color-input",
      ) as HTMLInputElement;
      expect(colorInput.value).toBe("#FFFFFF");

      expect(screen.getByTestId("appearance-no-image")).toHaveTextContent(
        "No background image configured",
      );

      // In Default (none) mode, image-specific controls are disabled
      const slider = screen.getByTestId(
        "appearance-opacity-slider",
      ) as HTMLInputElement;
      expect(slider).toBeDisabled();

      expect(screen.getByTestId("appearance-position-center")).toBeDisabled();
      expect(screen.getByTestId("appearance-size-cover")).toBeDisabled();

      const saveButton = screen.getByTestId("appearance-save-button");
      expect(saveButton).toBeDisabled();
    });

    it("Section 47: loads color admin settings (color mode, #F4EFE8)", async () => {
      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/admin/page-appearance`, () => {
          return HttpResponse.json({ data: colorAppearanceDto });
        }),
      );

      renderAdminRouter();

      expect(
        await screen.findByTestId("appearance-mode-color"),
      ).toHaveAttribute("aria-checked", "true");

      const colorPicker = screen.getByTestId(
        "appearance-color-picker",
      ) as HTMLInputElement;
      expect(colorPicker.value.toUpperCase()).toBe("#F4EFE8");

      const colorInput = screen.getByTestId(
        "appearance-color-input",
      ) as HTMLInputElement;
      expect(colorInput.value).toBe("#F4EFE8");

      // Overlay and position controls are disabled in color mode
      expect(screen.getByTestId("appearance-opacity-slider")).toBeDisabled();
      expect(screen.getByTestId("appearance-position-center")).toBeDisabled();
      expect(screen.getByTestId("appearance-size-cover")).toBeDisabled();

      // Live preview shows the background color
      const livePreview = screen.getByTestId("appearance-live-preview");
      expect(livePreview.style.backgroundColor).toBe("rgb(244, 239, 232)");
    });

    it("Section 48: loads image admin settings (image mode, #F4EFE8, media present)", async () => {
      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/admin/page-appearance`, () => {
          return HttpResponse.json({ data: existingAppearanceDto });
        }),
      );

      renderAdminRouter();

      expect(
        await screen.findByTestId("appearance-mode-image"),
      ).toHaveAttribute("aria-checked", "true");

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

      // Controls are enabled in image mode
      const slider = screen.getByTestId(
        "appearance-opacity-slider",
      ) as HTMLInputElement;
      expect(slider).not.toBeDisabled();
      expect(slider.value).toBe("50");

      const topRadio = screen.getByTestId("appearance-position-top");
      expect(topRadio).not.toBeDisabled();
      expect(topRadio).toHaveAttribute("aria-checked", "true");

      const containRadio = screen.getByTestId("appearance-size-contain");
      expect(containRadio).not.toBeDisabled();
      expect(containRadio).toHaveAttribute("aria-checked", "true");

      // Live preview matches loaded styles
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

  describe("Color Picker & Hex Text Input Sync & Validation", () => {
    it("Section 49: updates text input when color picker changes", async () => {
      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/admin/page-appearance`, () => {
          return HttpResponse.json({ data: colorAppearanceDto });
        }),
      );

      renderAdminRouter();

      await screen.findByTestId("appearance-mode-color");

      const colorPicker = screen.getByTestId("appearance-color-picker");
      fireEvent.change(colorPicker, { target: { value: "#eae6df" } });

      const colorInput = screen.getByTestId(
        "appearance-color-input",
      ) as HTMLInputElement;
      expect(colorInput.value).toBe("#EAE6DF");
    });

    it("Section 50: updates color picker when valid hex is typed into text input", async () => {
      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/admin/page-appearance`, () => {
          return HttpResponse.json({ data: colorAppearanceDto });
        }),
      );

      renderAdminRouter();

      await screen.findByTestId("appearance-mode-color");

      const colorInput = screen.getByTestId("appearance-color-input");
      fireEvent.change(colorInput, { target: { value: "#00FF00" } });

      const colorPicker = screen.getByTestId(
        "appearance-color-picker",
      ) as HTMLInputElement;
      expect(colorPicker.value.toUpperCase()).toBe("#00FF00");
    });

    it("Section 51: normalizes lowercase hex to uppercase before sending API payload", async () => {
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
                background_color: "#F4EFE8",
              },
            });
          },
        ),
      );

      renderAdminRouter();

      await screen.findByTestId("appearance-mode-none");

      const colorInput = screen.getByTestId("appearance-color-input");
      fireEvent.change(colorInput, { target: { value: "#f4efe8" } });

      const saveBtn = screen.getByTestId("appearance-save-button");
      expect(saveBtn).toBeEnabled();
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(patchPayload).toEqual({
          background_color: "#F4EFE8",
        });
      });
    });

    it("Section 52: invalid color blocks API and shows validation error", async () => {
      let patchCalled = false;

      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/admin/page-appearance`, () => {
          return HttpResponse.json({ data: defaultAppearanceDto });
        }),
        http.patch(`${env.apiBaseUrl}/api/v1/admin/page-appearance`, () => {
          patchCalled = true;
          return HttpResponse.json({ data: defaultAppearanceDto });
        }),
      );

      renderAdminRouter();

      await screen.findByTestId("appearance-mode-none");

      const colorInput = screen.getByTestId("appearance-color-input");
      fireEvent.change(colorInput, { target: { value: "red" } });

      expect(screen.getByTestId("appearance-color-error")).toHaveTextContent(
        /Color must be a valid 6-character hex code/i,
      );

      const saveBtn = screen.getByTestId("appearance-save-button");
      fireEvent.click(saveBtn);

      expect(patchCalled).toBe(false);
    });
  });

  describe("Mode Switching & Preservation Semantics", () => {
    it("Section 53: switching none -> color sends background_mode: 'color'", async () => {
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
                background_mode: "color",
              },
            });
          },
        ),
      );

      renderAdminRouter();

      await screen.findByTestId("appearance-mode-none");

      fireEvent.click(screen.getByTestId("appearance-mode-color"));

      const saveBtn = screen.getByTestId("appearance-save-button");
      expect(saveBtn).toBeEnabled();
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(patchPayload).toEqual({
          background_mode: "color",
        });
      });
    });

    it("Section 54: switching color -> none preserves stored color and sends background_mode: 'none'", async () => {
      let patchPayload: unknown = null;

      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/admin/page-appearance`, () => {
          return HttpResponse.json({ data: colorAppearanceDto });
        }),
        http.patch(
          `${env.apiBaseUrl}/api/v1/admin/page-appearance`,
          async ({ request }) => {
            patchPayload = await request.json();
            return HttpResponse.json({
              data: {
                ...colorAppearanceDto,
                background_mode: "none",
              },
            });
          },
        ),
      );

      renderAdminRouter();

      await screen.findByTestId("appearance-mode-color");

      fireEvent.click(screen.getByTestId("appearance-mode-none"));

      const saveBtn = screen.getByTestId("appearance-save-button");
      expect(saveBtn).toBeEnabled();
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(patchPayload).toEqual({
          background_mode: "none",
        });
      });
    });

    it("Section 55: switching image -> color does not delete stored image", async () => {
      let patchPayload: unknown = null;

      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/admin/page-appearance`, () => {
          return HttpResponse.json({ data: existingAppearanceDto });
        }),
        http.patch(
          `${env.apiBaseUrl}/api/v1/admin/page-appearance`,
          async ({ request }) => {
            patchPayload = await request.json();
            return HttpResponse.json({
              data: {
                ...existingAppearanceDto,
                background_mode: "color",
              },
            });
          },
        ),
      );

      renderAdminRouter();

      await screen.findByTestId("appearance-mode-image");

      fireEvent.click(screen.getByTestId("appearance-mode-color"));

      const saveBtn = screen.getByTestId("appearance-save-button");
      expect(saveBtn).toBeEnabled();
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(patchPayload).toEqual({
          background_mode: "color",
        });
      });

      // Stored image is still present in the UI
      expect(
        screen.getByTestId("appearance-current-image"),
      ).toBeInTheDocument();
    });

    it("Section 56: switching color -> image with existing stored image sends background_mode: 'image'", async () => {
      let patchPayload: unknown = null;

      const colorWithStoredImage: AdminPageAppearanceDto = {
        ...existingAppearanceDto,
        background_mode: "color",
      };

      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/admin/page-appearance`, () => {
          return HttpResponse.json({ data: colorWithStoredImage });
        }),
        http.patch(
          `${env.apiBaseUrl}/api/v1/admin/page-appearance`,
          async ({ request }) => {
            patchPayload = await request.json();
            return HttpResponse.json({
              data: {
                ...colorWithStoredImage,
                background_mode: "image",
              },
            });
          },
        ),
      );

      renderAdminRouter();

      await screen.findByTestId("appearance-mode-color");

      fireEvent.click(screen.getByTestId("appearance-mode-image"));

      const saveBtn = screen.getByTestId("appearance-save-button");
      expect(saveBtn).toBeEnabled();
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(patchPayload).toEqual({
          background_mode: "image",
        });
      });
    });

    it("Section 57: selecting Image mode without media blocks save and shows validation error", async () => {
      let patchCalled = false;

      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/admin/page-appearance`, () => {
          return HttpResponse.json({ data: defaultAppearanceDto });
        }),
        http.patch(`${env.apiBaseUrl}/api/v1/admin/page-appearance`, () => {
          patchCalled = true;
          return HttpResponse.json({ data: defaultAppearanceDto });
        }),
      );

      renderAdminRouter();

      await screen.findByTestId("appearance-mode-none");

      fireEvent.click(screen.getByTestId("appearance-mode-image"));

      expect(screen.getByTestId("appearance-mode-error")).toHaveTextContent(
        /Upload an image before switching to Image mode/i,
      );

      const saveBtn = screen.getByTestId("appearance-save-button");
      fireEvent.click(saveBtn);

      expect(patchCalled).toBe(false);
    });
  });

  describe("Admin Image Upload & Removal Flows", () => {
    it("Section 58: upload image while in color mode assigns media without changing mode", async () => {
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

      let currentData = { ...colorAppearanceDto };

      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/admin/page-appearance`, () => {
          return HttpResponse.json({ data: currentData });
        }),
        http.post(`${env.apiBaseUrl}/api/v1/admin/media/upload`, () => {
          return HttpResponse.json({ data: uploadedMedia }, { status: 201 });
        }),
        http.patch(
          `${env.apiBaseUrl}/api/v1/admin/page-appearance`,
          async ({ request }) => {
            patchPayload = await request.json();
            currentData = {
              ...currentData,
              background_media: uploadedMedia,
            };
            return HttpResponse.json({
              data: currentData,
            });
          },
        ),
      );

      renderAdminRouter();

      await screen.findByTestId("appearance-mode-color");

      const fileInput = screen.getByTestId("appearance-file-input");
      const file = new File(["dummy content"], "photo.webp", {
        type: "image/webp",
      });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(patchPayload).toEqual({
          background_media_id: uploadedMedia.id,
        });
      });

      // Mode remains color
      expect(screen.getByTestId("appearance-mode-color")).toHaveAttribute(
        "aria-checked",
        "true",
      );

      // Helpful notice shown to user
      expect(
        screen.getByText(/Select “Image” to use it as the active background/i),
      ).toBeInTheDocument();
    });

    it("Section 59: remove image in image mode atomically switches mode to none and detaches media", async () => {
      let patchPayload: unknown = null;

      let currentData = { ...existingAppearanceDto };

      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/admin/page-appearance`, () => {
          return HttpResponse.json({ data: currentData });
        }),
        http.patch(
          `${env.apiBaseUrl}/api/v1/admin/page-appearance`,
          async ({ request }) => {
            patchPayload = await request.json();
            currentData = {
              ...currentData,
              background_mode: "none",
              background_media: null,
            };
            return HttpResponse.json({
              data: currentData,
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
          background_mode: "none",
          background_media_id: null,
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId("appearance-no-image")).toBeInTheDocument();
        expect(screen.getByTestId("appearance-mode-none")).toHaveAttribute(
          "aria-checked",
          "true",
        );
      });
    });

    it("Section 60: remove image in color mode preserves mode and only detaches media", async () => {
      let patchPayload: unknown = null;

      let currentData: AdminPageAppearanceDto = {
        ...existingAppearanceDto,
        background_mode: "color",
      };

      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/admin/page-appearance`, () => {
          return HttpResponse.json({ data: currentData });
        }),
        http.patch(
          `${env.apiBaseUrl}/api/v1/admin/page-appearance`,
          async ({ request }) => {
            patchPayload = await request.json();
            currentData = {
              ...currentData,
              background_media: null,
            };
            return HttpResponse.json({
              data: currentData,
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
        expect(screen.getByTestId("appearance-mode-color")).toHaveAttribute(
          "aria-checked",
          "true",
        );
        expect(screen.getByTestId("appearance-no-image")).toBeInTheDocument();
      });
    });

    it("Section 15: admin GET with full admin image DTO parses successfully, renders preview, no INVALID_API_RESPONSE", async () => {
      const fullAdminImageMedia: AdminImageMedia = {
        id: "77777777-7777-4777-8777-777777777777",
        type: "image",
        url: "http://localhost:8000/uploads/background-full.jpg",
        original_filename: "background-full.jpg",
        mime_type: "image/jpeg",
        file_size: 246810,
        alt_text: "Full Admin Image",
        created_at: "2026-10-20T14:30:00Z",
      };

      const appearanceWithFullImage: AdminPageAppearanceDto = {
        background_mode: "image",
        background_color: "#F4EFE8",
        background_media: fullAdminImageMedia,
        overlay_opacity: 0.6,
        background_position: "center",
        background_size: "cover",
      };

      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/admin/page-appearance`, () => {
          return HttpResponse.json({ data: appearanceWithFullImage });
        }),
      );

      renderAdminRouter();

      expect(
        await screen.findByTestId("appearance-mode-image"),
      ).toHaveAttribute("aria-checked", "true");

      // Verify no error banner or INVALID_API_RESPONSE
      expect(
        screen.queryByText(/INVALID_API_RESPONSE/i),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(/The server returned an unexpected response/i),
      ).not.toBeInTheDocument();

      // Verify thumbnail and live preview render
      const thumbnail = (await screen.findByTestId(
        "appearance-current-image",
      )) as HTMLImageElement;
      expect(thumbnail.src).toBe(fullAdminImageMedia.url);

      const livePreview = screen.getByTestId("appearance-live-preview");
      expect(livePreview.style.backgroundImage).toContain(
        fullAdminImageMedia.url,
      );
    });

    it("Section 16: admin PATCH with full admin image DTO parses, canonical state updates, live preview updates, no error UI", async () => {
      let patchPayload: unknown = null;

      const fullAdminMedia: AdminImageMedia = {
        id: "88888888-8888-4888-8888-888888888888",
        type: "image",
        url: "http://localhost:8000/uploads/patched-bg.jpg",
        original_filename: "patched-bg.jpg",
        mime_type: "image/jpeg",
        file_size: 512000,
        alt_text: null,
        created_at: "2026-10-20T15:00:00Z",
      };

      let currentData: AdminPageAppearanceDto = {
        background_mode: "image",
        background_color: "#FFFFFF",
        background_media: fullAdminMedia,
        overlay_opacity: 0.35,
        background_position: "center",
        background_size: "cover",
      };

      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/admin/page-appearance`, () => {
          return HttpResponse.json({ data: currentData });
        }),
        http.patch(
          `${env.apiBaseUrl}/api/v1/admin/page-appearance`,
          async ({ request }) => {
            patchPayload = await request.json();
            currentData = {
              ...currentData,
              overlay_opacity: 0.8,
            };
            return HttpResponse.json({ data: currentData });
          },
        ),
      );

      renderAdminRouter();

      await screen.findByTestId("appearance-mode-image");

      const slider = screen.getByTestId(
        "appearance-opacity-slider",
      ) as HTMLInputElement;
      fireEvent.change(slider, { target: { value: "80" } });

      const saveBtn = screen.getByTestId("appearance-save-button");
      expect(saveBtn).toBeEnabled();
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(patchPayload).toEqual({
          overlay_opacity: 0.8,
        });
      });

      // Assert no INVALID_API_RESPONSE error banner appeared
      expect(
        screen.queryByText(/INVALID_API_RESPONSE/i),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(/The server returned an unexpected response/i),
      ).not.toBeInTheDocument();

      // Assert save success feedback
      await waitFor(() => {
        expect(
          screen.getByText(/Appearance settings saved successfully/i),
        ).toBeInTheDocument();
      });

      // Preview retains image
      const livePreview = screen.getByTestId("appearance-live-preview");
      expect(livePreview.style.backgroundImage).toContain(fullAdminMedia.url);
    });

    it("Section 17: upload image -> PATCH integration flow with full admin media DTO succeeds without INVALID_API_RESPONSE", async () => {
      let patchPayload: unknown = null;

      const uploadedMedia: AdminImageMedia = {
        type: "image",
        id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
        url: "http://localhost:8000/uploads/hero-background.webp",
        original_filename: "hero-background.webp",
        mime_type: "image/webp",
        file_size: 987654,
        alt_text: null,
        created_at: "2026-10-20T16:00:00Z",
      };

      let currentData: AdminPageAppearanceDto = { ...defaultAppearanceDto };

      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/admin/page-appearance`, () => {
          return HttpResponse.json({ data: currentData });
        }),
        http.post(`${env.apiBaseUrl}/api/v1/admin/media/upload`, () => {
          return HttpResponse.json({ data: uploadedMedia }, { status: 201 });
        }),
        http.patch(
          `${env.apiBaseUrl}/api/v1/admin/page-appearance`,
          async ({ request }) => {
            patchPayload = await request.json();
            currentData = {
              ...currentData,
              background_media: uploadedMedia,
            };
            return HttpResponse.json({ data: currentData });
          },
        ),
      );

      renderAdminRouter();

      await screen.findByTestId("appearance-mode-none");

      const fileInput = screen.getByTestId("appearance-file-input");
      const file = new File(["hero content"], "hero-background.webp", {
        type: "image/webp",
      });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(patchPayload).toEqual({
          background_media_id: uploadedMedia.id,
        });
      });

      // Verify no error UI
      expect(
        screen.queryByText(/INVALID_API_RESPONSE/i),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(/The server returned an unexpected response/i),
      ).not.toBeInTheDocument();

      // Verify assigned image preview thumbnail
      const thumbnail = (await screen.findByTestId(
        "appearance-current-image",
      )) as HTMLImageElement;
      expect(thumbnail.src).toBe(uploadedMedia.url);
    });
  });

  describe("Overlay, Position, Size Controls & Live Preview Behavior", () => {
    it("Section 65: live preview immediately updates background on mode switch before save", async () => {
      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/admin/page-appearance`, () => {
          return HttpResponse.json({ data: defaultAppearanceDto });
        }),
      );

      renderAdminRouter();

      await screen.findByTestId("appearance-mode-none");

      const livePreview = screen.getByTestId("appearance-live-preview");
      expect(livePreview.style.backgroundImage).toBe("none");

      // Switch to Color
      fireEvent.click(screen.getByTestId("appearance-mode-color"));
      expect(livePreview.style.backgroundColor).toBe("rgb(255, 255, 255)");
    });

    it("Section 66 & 67: overlay, position, and size controls are enabled in image mode and disabled in color/none modes", async () => {
      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/admin/page-appearance`, () => {
          return HttpResponse.json({ data: existingAppearanceDto });
        }),
      );

      renderAdminRouter();

      await screen.findByTestId("appearance-mode-image");

      const slider = screen.getByTestId(
        "appearance-opacity-slider",
      ) as HTMLInputElement;
      expect(slider).not.toBeDisabled();
      expect(
        screen.getByTestId("appearance-position-center"),
      ).not.toBeDisabled();
      expect(screen.getByTestId("appearance-size-cover")).not.toBeDisabled();

      // Switch to Color: controls become disabled, values preserved
      fireEvent.click(screen.getByTestId("appearance-mode-color"));
      expect(slider).toBeDisabled();
      expect(slider.value).toBe("50");
      expect(screen.getByTestId("appearance-position-center")).toBeDisabled();
      expect(screen.getByTestId("appearance-size-cover")).toBeDisabled();

      // Switch to None: controls stay disabled
      fireEvent.click(screen.getByTestId("appearance-mode-none"));
      expect(slider).toBeDisabled();
      expect(slider.value).toBe("50");
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
        background_mode: "none",
        background_color: "#FFFFFF",
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

    it("Section 61: renders default layout without background styles or overlay when background_mode = 'none'", async () => {
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
      expect(wrapper.style.backgroundColor).toBe("");

      expect(
        screen.queryByTestId("public-fixed-background"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("public-page-overlay"),
      ).not.toBeInTheDocument();
    });

    it("Section 62: renders solid background-color and no overlay when background_mode = 'color'", async () => {
      const publicColorPage: PublicPageResponse = {
        ...basePublicPage,
        appearance: {
          background_mode: "color",
          background_color: "#F4EFE8",
          background_media: null,
          overlay_opacity: 0.35,
          background_position: "center",
          background_size: "cover",
        },
      };

      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/public/page`, () => {
          return HttpResponse.json({ data: publicColorPage });
        }),
      );

      renderPublicView();

      expect(
        await screen.findByRole("heading", { name: "About Us" }),
      ).toBeInTheDocument();

      const bgLayer = screen.getByTestId("public-fixed-background");
      expect(bgLayer.style.backgroundColor).toBe("rgb(244, 239, 232)");
      expect(bgLayer.style.backgroundImage).toBe("");

      expect(
        screen.queryByTestId("public-page-overlay"),
      ).not.toBeInTheDocument();
    });

    it("Section 63: renders background image, position, size, base color, and overlay on dedicated layer when background_mode = 'image'", async () => {
      const publicWithBackground: PublicPageResponse = {
        ...basePublicPage,
        appearance: {
          background_mode: "image",
          background_color: "#F4EFE8",
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

      const bgLayer = screen.getByTestId("public-fixed-background");
      expect(bgLayer.style.backgroundColor).toBe("rgb(244, 239, 232)");
      expect(bgLayer.style.backgroundImage).toContain(
        "https://api.enstisax.com/uploads/bg-hero.webp",
      );
      expect(bgLayer.style.backgroundPosition).toBe("top");
      expect(bgLayer.style.backgroundSize).toBe("cover");
      expect(bgLayer.style.backgroundRepeat).toBe("no-repeat");

      const overlay = screen.getByTestId("public-page-overlay");
      expect(overlay.style.opacity).toBe("0.4");
    });

    it("Section 64: defensive rendering when background_mode = 'image' but background_media is null", async () => {
      // Defensive test verifying no crashes if malformed state arrives
      const malformedData: PublicPageResponse = {
        ...basePublicPage,
        appearance: {
          background_mode: "image",
          background_color: "#F4EFE8",
          background_media: null,
          overlay_opacity: 0.35,
          background_position: "center",
          background_size: "cover",
        },
      };

      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/public/page`, () => {
          return HttpResponse.json({ data: malformedData });
        }),
      );

      renderPublicView();

      expect(
        await screen.findByRole("heading", { name: "About Us" }),
      ).toBeInTheDocument();

      const bgLayer = screen.getByTestId("public-fixed-background");
      expect(bgLayer.style.backgroundColor).toBe("rgb(244, 239, 232)");
      expect(bgLayer.style.backgroundImage).toBe("");
      expect(
        screen.queryByTestId("public-page-overlay"),
      ).not.toBeInTheDocument();
    });

    it("Section 68: maintains identical appearance settings when switching between English and German", async () => {
      const enData: PublicPageResponse = {
        ...basePublicPage,
        page: {
          ...basePublicPage.page,
          title: "Saxophone Ensemble",
        },
        appearance: {
          background_mode: "image",
          background_color: "#F4EFE8",
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

      const bgLayer = screen.getByTestId("public-fixed-background");
      expect(bgLayer.style.backgroundImage).toContain(
        "https://api.enstisax.com/uploads/bg-hero.webp",
      );

      // Switch language to German
      const [deButton] = screen.getAllByTestId("lang-switch-de");
      expect(deButton).toBeDefined();
      if (!deButton) throw new Error("DE button not found");
      fireEvent.click(deButton);

      await screen.findByText("Saxophon-Ensemble");

      // Verify appearance remains identical
      expect(bgLayer.style.backgroundImage).toContain(
        "https://api.enstisax.com/uploads/bg-hero.webp",
      );
      expect(bgLayer.style.backgroundPosition).toBe("center");
      expect(bgLayer.style.backgroundSize).toBe("cover");

      const overlay = screen.getByTestId("public-page-overlay");
      expect(overlay.style.opacity).toBe("0.45");
    });

    it("Section 34 & 37: renders exactly ONE dedicated custom background layer with exact styles in image mode", async () => {
      const publicImagePage: PublicPageResponse = {
        ...basePublicPage,
        appearance: {
          background_mode: "image",
          background_color: "#F4EFE8",
          background_media: {
            id: "99999999-9999-4999-8999-999999999999",
            type: "image",
            url: "https://api.enstisax.com/uploads/bg-hero.webp",
          },
          overlay_opacity: 0.5,
          background_position: "top",
          background_size: "cover",
        },
      };

      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/public/page`, () => {
          return HttpResponse.json({ data: publicImagePage });
        }),
      );

      renderPublicView();

      await screen.findByRole("heading", { name: "About Us" });

      const bgLayers = screen.getAllByTestId("public-fixed-background");
      expect(bgLayers).toHaveLength(1);

      const bgLayer = bgLayers[0]!;
      expect(bgLayer.style.backgroundColor).toBe("rgb(244, 239, 232)");
      expect(bgLayer.style.backgroundImage).toContain(
        "https://api.enstisax.com/uploads/bg-hero.webp",
      );
      expect(bgLayer.style.backgroundPosition).toBe("top");
      expect(bgLayer.style.backgroundSize).toBe("cover");
      expect(bgLayer.style.backgroundRepeat).toBe("no-repeat");
    });

    it("Section 35 & 40: renders exactly ONE background layer with no image URL and no overlay in color mode", async () => {
      const publicColorPage: PublicPageResponse = {
        ...basePublicPage,
        appearance: {
          background_mode: "color",
          background_color: "#243A3A",
          background_media: null,
          overlay_opacity: 0.35,
          background_position: "center",
          background_size: "cover",
        },
      };

      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/public/page`, () => {
          return HttpResponse.json({ data: publicColorPage });
        }),
      );

      renderPublicView();

      await screen.findByRole("heading", { name: "About Us" });

      const bgLayers = screen.getAllByTestId("public-fixed-background");
      expect(bgLayers).toHaveLength(1);
      expect(bgLayers[0]!.style.backgroundColor).toBe("rgb(36, 58, 58)");
      expect(bgLayers[0]!.style.backgroundImage).toBe("");

      // Assert custom image overlay is not active in color mode
      expect(
        screen.queryByTestId("public-page-overlay"),
      ).not.toBeInTheDocument();
    });

    it("Section 36: none mode renders no custom fixed appearance layer or image", async () => {
      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/public/page`, () => {
          return HttpResponse.json({
            data: {
              ...basePublicPage,
              appearance: {
                background_mode: "none",
                background_color: "#FFFFFF",
                background_media: null,
                overlay_opacity: 0.35,
                background_position: "center",
                background_size: "cover",
              },
            },
          });
        }),
      );

      renderPublicView();

      await screen.findByRole("heading", { name: "About Us" });

      expect(
        screen.queryByTestId("public-fixed-background"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("public-page-overlay"),
      ).not.toBeInTheDocument();
    });

    it("Section 38: size=contain applies contain and no-repeat to fixed background layer", async () => {
      const publicContainPage: PublicPageResponse = {
        ...basePublicPage,
        appearance: {
          background_mode: "image",
          background_color: "#FFFFFF",
          background_media: {
            id: "99999999-9999-4999-8999-999999999999",
            type: "image",
            url: "https://api.enstisax.com/uploads/bg-contain.webp",
          },
          overlay_opacity: 0.2,
          background_position: "bottom",
          background_size: "contain",
        },
      };

      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/public/page`, () => {
          return HttpResponse.json({ data: publicContainPage });
        }),
      );

      renderPublicView();

      await screen.findByRole("heading", { name: "About Us" });

      const bgLayer = screen.getByTestId("public-fixed-background");
      expect(bgLayer.style.backgroundSize).toBe("contain");
      expect(bgLayer.style.backgroundPosition).toBe("bottom");
      expect(bgLayer.style.backgroundRepeat).toBe("no-repeat");
    });

    it("Section 39: overlay layer receives opacity and pointer-events: none in image mode", async () => {
      const publicWithOverlay: PublicPageResponse = {
        ...basePublicPage,
        appearance: {
          background_mode: "image",
          background_color: "#F4EFE8",
          background_media: {
            id: "99999999-9999-4999-8999-999999999999",
            type: "image",
            url: "https://api.enstisax.com/uploads/bg-hero.webp",
          },
          overlay_opacity: 0.65,
          background_position: "center",
          background_size: "cover",
        },
      };

      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/public/page`, () => {
          return HttpResponse.json({ data: publicWithOverlay });
        }),
      );

      renderPublicView();

      await screen.findByRole("heading", { name: "About Us" });

      const overlay = screen.getByTestId("public-page-overlay");
      expect(overlay.style.opacity).toBe("0.65");
      // Verify pointer-events is none via computed or inline style / className
      expect(overlay.className).toBeTruthy();
    });

    it("Section 41 & 42: public content renders in dedicated layer, and multiple sections share exactly 1 background layer", async () => {
      const multiSectionPage: PublicPageResponse = {
        ...basePublicPage,
        sections: [
          ...basePublicPage.sections,
          {
            id: "20000000-0000-4000-8000-000000000002",
            key: "gallery",
            title: "Gallery Section",
            navigation_label: "Gallery",
            sort_order: 2,
            blocks: [],
          },
          {
            id: "30000000-0000-4000-8000-000000000003",
            key: "testimonials",
            title: "Testimonials Section",
            navigation_label: "Testimonials",
            sort_order: 3,
            blocks: [],
          },
          {
            id: "40000000-0000-4000-8000-000000000004",
            key: "contact-us",
            title: "Contact Section",
            navigation_label: "Contact",
            sort_order: 4,
            blocks: [],
          },
        ],
        appearance: {
          background_mode: "image",
          background_color: "#F4EFE8",
          background_media: {
            id: "99999999-9999-4999-8999-999999999999",
            type: "image",
            url: "https://api.enstisax.com/uploads/bg-hero.webp",
          },
          overlay_opacity: 0.4,
          background_position: "center",
          background_size: "cover",
        },
      };

      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/public/page`, () => {
          return HttpResponse.json({ data: multiSectionPage });
        }),
      );

      renderPublicView();

      await screen.findByRole("heading", { name: "About Us" });
      expect(
        screen.getByRole("heading", { name: "Gallery Section" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Testimonials Section" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Contact Section" }),
      ).toBeInTheDocument();

      // Assert content is inside public-page-content
      const contentLayer = screen.getByTestId("public-page-content");
      expect(contentLayer).toBeInTheDocument();

      // Assert exactly 1 background layer and 1 overlay layer exist across all sections
      const bgLayers = screen.getAllByTestId("public-fixed-background");
      expect(bgLayers).toHaveLength(1);

      const overlays = screen.getAllByTestId("public-page-overlay");
      expect(overlays).toHaveLength(1);
    });

    it("Section 46 & 47: contact and testimonial forms remain interactive and clickable above background layers", async () => {
      const pageWithForms: PublicPageResponse = {
        ...basePublicPage,
        sections: [
          {
            id: "40000000-0000-4000-8000-000000000004",
            key: "contact-us",
            title: "Contact Section",
            navigation_label: "Contact",
            sort_order: 1,
            blocks: [],
          },
        ],
        appearance: {
          background_mode: "image",
          background_color: "#F4EFE8",
          background_media: {
            id: "99999999-9999-4999-8999-999999999999",
            type: "image",
            url: "https://api.enstisax.com/uploads/bg-hero.webp",
          },
          overlay_opacity: 0.4,
          background_position: "center",
          background_size: "cover",
        },
      };

      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/public/page`, () => {
          return HttpResponse.json({ data: pageWithForms });
        }),
      );

      renderPublicView();

      await screen.findByRole("heading", { name: "Contact Section" });

      const nameInput = screen.getByTestId("contact-name");
      expect(nameInput).toBeInTheDocument();
      expect(nameInput).not.toBeDisabled();

      fireEvent.change(nameInput, { target: { value: "John Coltrane" } });
      expect((nameInput as HTMLInputElement).value).toBe("John Coltrane");

      const submitButton = screen.getByRole("button", {
        name: /Send Message/i,
      });
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).toBeEnabled();
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
