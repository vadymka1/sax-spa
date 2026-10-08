import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { server } from "./msw/server";
import { env } from "../lib/env";
import {
  getStoredLocale,
  setStoredLocale,
  LOCALE_STORAGE_KEY,
} from "../lib/locale";
import { PublicPage } from "../features/public-page/PublicPage";
import { SpaSectionCreateModal } from "../features/admin/sections/SpaSectionCreateModal";
import { SpaSectionEditModal } from "../features/admin/sections/SpaSectionEditModal";
import { ContentBlockCreateModal } from "../features/admin/content/ContentBlockCreateModal";
import { ContentBlockEditModal } from "../features/admin/content/ContentBlockEditModal";
import {
  AdminSpaSectionDto,
  AdminContentBlockDto,
  CreateContentBlockRequest,
  UpdateContentBlockRequest,
} from "../api/types";
import { validateGermanSectionTranslation } from "../features/admin/sections/sectionValidation";
import { authSession } from "../features/auth/authSession";

const VALID_SECTION_ID = "22222222-2222-4222-8222-222222222222";
const VALID_BLOCK_ID = "33333333-3333-4333-8333-333333333333";

const mockEnglishPublicPage = {
  data: {
    page: {
      id: "a1b2c3d4-e5f6-4890-abcd-ef1234567890",
      slug: "home",
      title: "SPA Saxophone Ensemble",
      seo_title: "SPA Saxophone Ensemble",
      seo_description: "English description",
      seo_keywords: ["sax"],
    },
    appearance: {
      background_media: null,
      overlay_opacity: 0.35,
      background_position: "center" as const,
      background_size: "cover" as const,
    },
    sections: [
      {
        id: "e0b9687e-e2e4-4d8b-9a84-9343ee6df322",
        key: "about-us",
        title: "About Us",
        navigation_label: "About Us",
        sort_order: 10,
        blocks: [
          {
            id: "7649fb99-702b-47e1-b4cb-d48e89f81d19",
            block_type: "text",
            title: "Biography",
            text: "English ensemble biography.",
            media: null,
            sort_order: 10,
          },
        ],
      },
      {
        id: "c0b9687e-e2e4-4d8b-9a84-9343ee6df325",
        key: "contact-us",
        title: "Contact Us",
        navigation_label: "Contact",
        sort_order: 90,
        blocks: [],
      },
    ],
    testimonials: [],
  },
};

const mockGermanPublicPage = {
  data: {
    page: {
      id: "a1b2c3d4-e5f6-4890-abcd-ef1234567890",
      slug: "home",
      title: "SPA Saxophon Ensemble",
      seo_title: "SPA Saxophon Ensemble",
      seo_description: "Deutsche Beschreibung",
      seo_keywords: ["sax"],
    },
    appearance: {
      background_media: null,
      overlay_opacity: 0.35,
      background_position: "center" as const,
      background_size: "cover" as const,
    },
    sections: [
      {
        id: "e0b9687e-e2e4-4d8b-9a84-9343ee6df322",
        key: "about-us",
        title: "Über uns",
        navigation_label: "Über uns",
        sort_order: 10,
        blocks: [
          {
            id: "7649fb99-702b-47e1-b4cb-d48e89f81d19",
            block_type: "text",
            title: "Biografie",
            text: "Deutsche Ensemble-Biografie.",
            media: null,
            sort_order: 10,
          },
        ],
      },
      {
        id: "c0b9687e-e2e4-4d8b-9a84-9343ee6df325",
        key: "contact-us",
        title: "Kontakt",
        navigation_label: "Kontakt",
        sort_order: 90,
        blocks: [],
      },
    ],
    testimonials: [],
  },
};

const sampleAdminSections: AdminSpaSectionDto[] = [
  {
    id: VALID_SECTION_ID,
    key: "about-us",
    title: "About Us",
    sort_order: 10,
    is_visible: true,
    content_block_count: 1,
    translations: {
      en: { name: "About Us" },
      de: { name: "Über uns" },
    },
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
      },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("FRONTEND MULTILANGUAGE V1 — ENGLISH AND GERMAN", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("1. Locale Storage and Defaults", () => {
    it("Section 65: defaults to 'en' when storage is empty", () => {
      expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBeNull();
      expect(getStoredLocale()).toBe("en");
    });

    it("Section 66: retrieves stored 'de' locale correctly", () => {
      localStorage.setItem(LOCALE_STORAGE_KEY, "de");
      expect(getStoredLocale()).toBe("de");
    });

    it("Section 67: falls back to 'en' when stored value is invalid ('fr')", () => {
      localStorage.setItem(LOCALE_STORAGE_KEY, "fr");
      expect(getStoredLocale()).toBe("en");
    });

    it("setStoredLocale persists valid locale", () => {
      setStoredLocale("de");
      expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("de");
      setStoredLocale("en");
      expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("en");
    });
  });

  describe("2. Public Page Locale Loading and Switcher", () => {
    it("Section 65: with no stored locale, fetches /public/page?locale=en and renders English", async () => {
      let requestedLocale: string | null = null;
      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/public/page`, ({ request }) => {
          const url = new URL(request.url);
          requestedLocale = url.searchParams.get("locale");
          return HttpResponse.json(mockEnglishPublicPage);
        }),
      );

      renderWithClient(<PublicPage />);

      await screen.findByRole("heading", { name: "About Us" });
      expect(requestedLocale).toBe("en");
      expect(screen.getByText("Biography")).toBeInTheDocument();
      expect(
        screen.getByText("English ensemble biography."),
      ).toBeInTheDocument();

      // Check active button in language switcher
      const enBtn = screen.getAllByTestId("lang-switch-en")[0]!;
      expect(enBtn).toHaveAttribute("aria-pressed", "true");
    });

    it("Section 66: with stored 'de', initializes and fetches /public/page?locale=de directly", async () => {
      localStorage.setItem(LOCALE_STORAGE_KEY, "de");

      let requestedLocale: string | null = null;
      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/public/page`, ({ request }) => {
          const url = new URL(request.url);
          requestedLocale = url.searchParams.get("locale");
          return HttpResponse.json(mockGermanPublicPage);
        }),
      );

      renderWithClient(<PublicPage />);

      await screen.findByRole("heading", { name: "Über uns" });
      expect(requestedLocale).toBe("de");
      expect(screen.getByText("Biografie")).toBeInTheDocument();
      expect(
        screen.getByText("Deutsche Ensemble-Biografie."),
      ).toBeInTheDocument();

      const deBtn = screen.getAllByTestId("lang-switch-de")[0]!;
      expect(deBtn).toHaveAttribute("aria-pressed", "true");
    });

    it("Section 68 & 69: switches EN -> DE and DE -> EN with persistence and active state", async () => {
      const localesRequested: string[] = [];
      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/public/page`, ({ request }) => {
          const url = new URL(request.url);
          const loc = url.searchParams.get("locale") || "none";
          localesRequested.push(loc);
          if (loc === "de") {
            return HttpResponse.json(mockGermanPublicPage);
          }
          return HttpResponse.json(mockEnglishPublicPage);
        }),
      );

      renderWithClient(<PublicPage />);

      await screen.findByRole("heading", { name: "About Us" });

      // Click German switcher button
      const deBtn = screen.getAllByTestId("lang-switch-de")[0]!;
      fireEvent.click(deBtn);

      await screen.findByRole("heading", { name: "Über uns" });
      expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("de");
      expect(localesRequested).toContain("de");
      expect(screen.getAllByTestId("lang-switch-de")[0]!).toHaveAttribute(
        "aria-pressed",
        "true",
      );

      // Click English switcher button back
      const enBtn = screen.getAllByTestId("lang-switch-en")[0]!;
      fireEvent.click(enBtn);

      await screen.findByRole("heading", { name: "About Us" });
      expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("en");
      expect(screen.getAllByTestId("lang-switch-en")[0]!).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });

    it("Section 70: renders backend fallback values without trying to parse or alter them", async () => {
      const fallbackGermanResponse = {
        data: {
          ...mockGermanPublicPage.data,
          sections: [
            {
              ...mockGermanPublicPage.data.sections[0],
              blocks: [
                {
                  id: "7649fb99-702b-47e1-b4cb-d48e89f81d19",
                  block_type: "text",
                  title: "Biography", // fallback English title from backend
                  text: "Deutscher Text",
                  media: null,
                  sort_order: 10,
                },
              ],
            },
          ],
        },
      };

      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/public/page`, () => {
          return HttpResponse.json(fallbackGermanResponse);
        }),
      );

      localStorage.setItem(LOCALE_STORAGE_KEY, "de");
      renderWithClient(<PublicPage />);

      await screen.findByRole("heading", { name: "Über uns" });
      expect(screen.getByText("Biography")).toBeInTheDocument();
      expect(screen.getByText("Deutscher Text")).toBeInTheDocument();
    });

    it("Section 71: query key isolates fast switch race EN -> DE -> EN", async () => {
      const delayDe = true;
      server.use(
        http.get(
          `${env.apiBaseUrl}/api/v1/public/page`,
          async ({ request }) => {
            const url = new URL(request.url);
            const loc = url.searchParams.get("locale");
            if (loc === "de" && delayDe) {
              await new Promise((resolve) => setTimeout(resolve, 80));
              return HttpResponse.json(mockGermanPublicPage);
            }
            return HttpResponse.json(mockEnglishPublicPage);
          },
        ),
      );

      renderWithClient(<PublicPage />);
      await screen.findByRole("heading", { name: "About Us" });

      const deBtn = screen.getAllByTestId("lang-switch-de")[0]!;
      const enBtn = screen.getAllByTestId("lang-switch-en")[0]!;

      // Fast toggle
      fireEvent.click(deBtn);
      fireEvent.click(enBtn);

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: "About Us" }),
        ).toBeInTheDocument();
      });

      // Wait out any delayed DE response to ensure it does not overwrite
      await new Promise((r) => setTimeout(r, 120));
      expect(
        screen.getByRole("heading", { name: "About Us" }),
      ).toBeInTheDocument();
      expect(
        screen.getByText("English ensemble biography."),
      ).toBeInTheDocument();
    });

    it("Section 85: updates public static Contact UI labels when switching language", async () => {
      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/public/page`, ({ request }) => {
          const url = new URL(request.url);
          return HttpResponse.json(
            url.searchParams.get("locale") === "de"
              ? mockGermanPublicPage
              : mockEnglishPublicPage,
          );
        }),
      );

      renderWithClient(<PublicPage />);

      // In EN: contact form labels
      await screen.findByText("Get in Touch");
      expect(screen.getByLabelText(/^Name/)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Email/)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Subject/)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Message/)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Send Message" }),
      ).toBeInTheDocument();

      // Switch to DE
      const deBtn = screen.getAllByTestId("lang-switch-de")[0]!;
      fireEvent.click(deBtn);

      await screen.findByText("Kontaktieren Sie uns");
      expect(screen.getByLabelText(/^E-Mail/)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Betreff/)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Nachricht/)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Nachricht senden" }),
      ).toBeInTheDocument();
    });
  });

  describe("3. Admin SpaSection Multilingual Editing", () => {
    it("Section 73: loads both EN and DE values in respective admin language fields", async () => {
      const section: AdminSpaSectionDto = {
        id: VALID_SECTION_ID,
        key: "about",
        title: "About Us",
        sort_order: 10,
        is_visible: true,
        content_block_count: 1,
        translations: {
          en: { name: "About Us" },
          de: { name: "Über uns" },
        },
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      };

      renderWithClient(
        <SpaSectionEditModal
          section={section}
          isOpen={true}
          onClose={vi.fn()}
        />,
      );

      // English active tab by default
      const enInput = screen.getByLabelText("Section Title *");
      expect(enInput).toHaveValue("About Us");

      // Switch to Deutsch tab
      const deTab = screen.getByRole("tab", { name: /Deutsch/i });
      fireEvent.click(deTab);

      const deInput = screen.getByLabelText("German Section Name");
      expect(deInput).toHaveValue("Über uns");
    });

    it("Section 74: displays missing DE as empty and does NOT prefill English text", async () => {
      const section: AdminSpaSectionDto = {
        id: VALID_SECTION_ID,
        key: "about",
        title: "About Us",
        sort_order: 10,
        is_visible: true,
        content_block_count: 1,
        translations: {
          en: { name: "About Us" },
          de: null,
        },
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      };

      renderWithClient(
        <SpaSectionEditModal
          section={section}
          isOpen={true}
          onClose={vi.fn()}
        />,
      );

      // Switch to DE tab
      fireEvent.click(screen.getByRole("tab", { name: /Deutsch/i }));

      const deInput = screen.getByLabelText("German Section Name");
      expect(deInput).toHaveValue("");
      expect(
        screen.getByText(/No German translation yet/i),
      ).toBeInTheDocument();
    });

    it("Section 75: creates section with EN only omitting fake German", async () => {
      let capturedPayload: unknown = null;
      server.use(
        http.post(
          `${env.apiBaseUrl}/api/v1/admin/spa-sections`,
          async ({ request }) => {
            capturedPayload = await request.json();
            return HttpResponse.json({
              data: {
                id: VALID_SECTION_ID,
                key: "concerts",
                title: "Concerts 2026",
                sort_order: 10,
                is_visible: true,
                created_at: "2026-01-01T00:00:00Z",
                updated_at: "2026-01-01T00:00:00Z",
              },
            });
          },
        ),
      );

      const onClose = vi.fn();
      renderWithClient(
        <SpaSectionCreateModal isOpen={true} onClose={onClose} />,
      );

      fireEvent.change(screen.getByLabelText("Section Title *"), {
        target: { value: "Concerts 2026" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Create Section" }));

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });

      expect(capturedPayload).toEqual({
        title: "Concerts 2026",
        name: "Concerts 2026",
        translations: {
          en: {
            name: "Concerts 2026",
          },
        },
      });
    });

    it("Section 76: creates section with EN and DE both provided", async () => {
      let capturedPayload: unknown = null;
      server.use(
        http.post(
          `${env.apiBaseUrl}/api/v1/admin/spa-sections`,
          async ({ request }) => {
            capturedPayload = await request.json();
            return HttpResponse.json({
              data: {
                id: VALID_SECTION_ID,
                key: "press",
                title: "Press",
                sort_order: 10,
                is_visible: true,
                created_at: "2026-01-01T00:00:00Z",
                updated_at: "2026-01-01T00:00:00Z",
              },
            });
          },
        ),
      );

      const onClose = vi.fn();
      renderWithClient(
        <SpaSectionCreateModal isOpen={true} onClose={onClose} />,
      );

      // Fill English
      fireEvent.change(screen.getByLabelText("Section Title *"), {
        target: { value: "Press" },
      });

      // Switch to Deutsch and fill German
      fireEvent.click(screen.getByRole("tab", { name: /Deutsch/i }));
      fireEvent.change(
        screen.getByLabelText("German Section Name (Optional)"),
        {
          target: { value: "Presse" },
        },
      );

      fireEvent.click(screen.getByRole("button", { name: "Create Section" }));

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });

      expect(capturedPayload).toEqual({
        title: "Press",
        name: "Press",
        translations: {
          en: {
            name: "Press",
          },
          de: {
            name: "Presse",
          },
        },
      });
    });

    it("Section 77: updating only DE sends translations.de without modifying EN", async () => {
      let capturedPatchPayload: unknown = null;
      server.use(
        http.patch(
          `${env.apiBaseUrl}/api/v1/admin/spa-sections/:id`,
          async ({ request }) => {
            capturedPatchPayload = await request.json();
            return HttpResponse.json({
              data: {
                id: VALID_SECTION_ID,
                key: "press",
                title: "Press",
                sort_order: 10,
                is_visible: true,
                created_at: "2026-01-01T00:00:00Z",
                updated_at: "2026-01-01T00:00:00Z",
              },
            });
          },
        ),
      );

      const section: AdminSpaSectionDto = {
        id: VALID_SECTION_ID,
        key: "press",
        title: "Press",
        sort_order: 10,
        is_visible: true,
        content_block_count: 0,
        translations: {
          en: { name: "Press" },
          de: { name: "Presse Alt" },
        },
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      };

      const onClose = vi.fn();
      renderWithClient(
        <SpaSectionEditModal
          section={section}
          isOpen={true}
          onClose={onClose}
        />,
      );

      // Go to German tab and edit German name
      fireEvent.click(screen.getByRole("tab", { name: /Deutsch/i }));
      fireEvent.change(screen.getByLabelText("German Section Name"), {
        target: { value: "Presse Neu" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });

      expect(capturedPatchPayload).toEqual({
        translations: {
          de: {
            name: "Presse Neu",
          },
        },
      });
    });
  });

  describe("4. Admin ContentBlock Multilingual Editing", () => {
    it("Section 78: loads EN and DE values and shares media", () => {
      const block: AdminContentBlockDto = {
        id: VALID_BLOCK_ID,
        spa_section_id: VALID_SECTION_ID,
        section_key: "about",
        block_type: "text_image",
        title: "Ensemble Photo",
        text: "English description",
        media: [
          {
            id: "22222222-2222-4222-8222-222222222221",
            media_type: "image",
            storage_provider: "local",
            original_filename: "sax.jpg",
          },
        ],
        sort_order: 10,
        is_visible: true,
        translations: {
          en: { title: "Ensemble Photo", text: "English description" },
          de: { title: "Ensemble Foto", text: "Deutsche Beschreibung" },
        },
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      };

      renderWithClient(
        <ContentBlockEditModal
          block={block}
          sections={sampleAdminSections}
          isOpen={true}
          onClose={vi.fn()}
        />,
      );

      // EN controls
      expect(screen.getByLabelText("Title (Optional)")).toHaveValue(
        "Ensemble Photo",
      );
      expect(screen.getByLabelText("Text Content *")).toHaveValue(
        "English description",
      );

      // Shared media rendered once
      expect(screen.getByText("sax.jpg")).toBeInTheDocument();

      // Switch to DE tab
      fireEvent.click(screen.getByRole("tab", { name: /Deutsch/i }));
      expect(screen.getByLabelText("German Title (Optional)")).toHaveValue(
        "Ensemble Foto",
      );
      expect(screen.getByLabelText("German Text Content")).toHaveValue(
        "Deutsche Beschreibung",
      );
      // Media still present and shared
      expect(screen.getByText("sax.jpg")).toBeInTheDocument();
    });

    it("Section 79: displays missing DE block as empty and marked missing", () => {
      const block: AdminContentBlockDto = {
        id: VALID_BLOCK_ID,
        spa_section_id: VALID_SECTION_ID,
        section_key: "about",
        block_type: "text",
        title: "History",
        text: "English history text",
        media: null,
        sort_order: 10,
        is_visible: true,
        translations: {
          en: { title: "History", text: "English history text" },
          de: null,
        },
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      };

      renderWithClient(
        <ContentBlockEditModal
          block={block}
          sections={sampleAdminSections}
          isOpen={true}
          onClose={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByRole("tab", { name: /Deutsch/i }));
      expect(screen.getByLabelText("German Title (Optional)")).toHaveValue("");
      expect(screen.getByLabelText("German Text Content")).toHaveValue("");
      expect(
        screen.getByText(/No German translation yet/i),
      ).toBeInTheDocument();
    });

    it("Section 80: stops submission if new DE has title only without DE text", async () => {
      let postCalled = false;
      server.use(
        http.post(`${env.apiBaseUrl}/api/v1/admin/content-blocks`, () => {
          postCalled = true;
          return HttpResponse.json({ data: {} });
        }),
      );

      renderWithClient(
        <ContentBlockCreateModal
          spaSectionId={VALID_SECTION_ID}
          isOpen={true}
          onClose={vi.fn()}
        />,
      );

      // Fill valid EN
      fireEvent.change(screen.getByLabelText("Text Content *"), {
        target: { value: "Valid English content" },
      });

      // Switch to DE and enter title only
      fireEvent.click(screen.getByRole("tab", { name: /Deutsch/i }));
      fireEvent.change(screen.getByLabelText("German Title (Optional)"), {
        target: { value: "Deutscher Titel" },
      });

      // Submit
      fireEvent.click(screen.getByRole("button", { name: "Create Block" }));

      // Validation error shown
      await screen.findByText(
        "German text is required when creating a German translation.",
      );
      expect(postCalled).toBe(false);
    });

    it("Section 81: allows new DE translation with text and optional blank title", async () => {
      let capturedPayload: CreateContentBlockRequest | null = null;
      server.use(
        http.post(
          `${env.apiBaseUrl}/api/v1/admin/content-blocks`,
          async ({ request }) => {
            capturedPayload =
              (await request.json()) as CreateContentBlockRequest;
            return HttpResponse.json({
              data: {
                id: VALID_BLOCK_ID,
                spa_section_id: VALID_SECTION_ID,
                section_key: "about-us",
                block_type: "text",
                title: null,
                text: "English body",
                media: null,
                sort_order: 10,
                is_visible: true,
                created_at: "2026-01-01T00:00:00Z",
                updated_at: "2026-01-01T00:00:00Z",
              },
            });
          },
        ),
      );

      const onClose = vi.fn();
      renderWithClient(
        <ContentBlockCreateModal
          spaSectionId={VALID_SECTION_ID}
          isOpen={true}
          onClose={onClose}
        />,
      );

      // Fill EN
      fireEvent.change(screen.getByLabelText("Text Content *"), {
        target: { value: "English body" },
      });

      // Fill DE text only (title blank)
      fireEvent.click(screen.getByRole("tab", { name: /Deutsch/i }));
      fireEvent.change(screen.getByLabelText("German Text Content"), {
        target: { value: "Deutscher Fließtext" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Create Block" }));

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });

      expect(capturedPayload).toEqual({
        spa_section_id: VALID_SECTION_ID,
        block_type: "text",
        text: "English body",
        translations: {
          en: {
            text: "English body",
          },
          de: {
            text: "Deutscher Fließtext",
          },
        },
      });
    });

    it("Section 82: existing DE translation allows editing title only without retyping text", async () => {
      let capturedPatchPayload: UpdateContentBlockRequest | null = null;
      server.use(
        http.patch(
          `${env.apiBaseUrl}/api/v1/admin/content-blocks/:id`,
          async ({ request }) => {
            capturedPatchPayload =
              (await request.json()) as UpdateContentBlockRequest;
            return HttpResponse.json({
              data: {
                id: VALID_BLOCK_ID,
                spa_section_id: VALID_SECTION_ID,
                section_key: "about-us",
                block_type: "text",
                title: "Original EN Title",
                text: "Original EN Text",
                media: null,
                sort_order: 10,
                is_visible: true,
                created_at: "2026-01-01T00:00:00Z",
                updated_at: "2026-01-01T00:00:00Z",
              },
            });
          },
        ),
      );

      const block: AdminContentBlockDto = {
        id: VALID_BLOCK_ID,
        spa_section_id: VALID_SECTION_ID,
        section_key: "about-us",
        block_type: "text",
        title: "Original EN Title",
        text: "Original EN Text",
        media: null,
        sort_order: 10,
        is_visible: true,
        translations: {
          en: { title: "Original EN Title", text: "Original EN Text" },
          de: { title: "Original DE Title", text: "Original DE Text" },
        },
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      };

      const onClose = vi.fn();
      renderWithClient(
        <ContentBlockEditModal
          block={block}
          sections={sampleAdminSections}
          isOpen={true}
          onClose={onClose}
        />,
      );

      // Edit DE title only
      fireEvent.click(screen.getByRole("tab", { name: /Deutsch/i }));
      fireEvent.change(screen.getByLabelText("German Title (Optional)"), {
        target: { value: "Neuer Deutscher Titel" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });

      expect(capturedPatchPayload).toEqual({
        title: "Original EN Title",
        text: "Original EN Text",
        translations: {
          de: {
            title: "Neuer Deutscher Titel",
          },
        },
      });
    });

    it("Section 83: existing DE translation allows editing text only and preserves title", async () => {
      let capturedPatchPayload: UpdateContentBlockRequest | null = null;
      server.use(
        http.patch(
          `${env.apiBaseUrl}/api/v1/admin/content-blocks/:id`,
          async ({ request }) => {
            capturedPatchPayload =
              (await request.json()) as UpdateContentBlockRequest;
            return HttpResponse.json({
              data: {
                id: VALID_BLOCK_ID,
                spa_section_id: VALID_SECTION_ID,
                section_key: "about-us",
                block_type: "text",
                title: "Original EN Title",
                text: "Original EN Text",
                media: null,
                sort_order: 10,
                is_visible: true,
                created_at: "2026-01-01T00:00:00Z",
                updated_at: "2026-01-01T00:00:00Z",
              },
            });
          },
        ),
      );

      const block: AdminContentBlockDto = {
        id: VALID_BLOCK_ID,
        spa_section_id: VALID_SECTION_ID,
        section_key: "about-us",
        block_type: "text",
        title: "Original EN Title",
        text: "Original EN Text",
        media: null,
        sort_order: 10,
        is_visible: true,
        translations: {
          en: { title: "Original EN Title", text: "Original EN Text" },
          de: { title: "Bestehender Deutscher Titel", text: "Alter DE Text" },
        },
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      };

      const onClose = vi.fn();
      renderWithClient(
        <ContentBlockEditModal
          block={block}
          sections={sampleAdminSections}
          isOpen={true}
          onClose={onClose}
        />,
      );

      // Edit DE text only
      fireEvent.click(screen.getByRole("tab", { name: /Deutsch/i }));
      fireEvent.change(screen.getByLabelText("German Text Content"), {
        target: { value: "Neuer DE Text" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });

      expect(capturedPatchPayload).toEqual({
        title: "Original EN Title",
        text: "Original EN Text",
        translations: {
          de: {
            text: "Neuer DE Text",
          },
        },
      });
    });

    it("Section 84: editing translations does not mutate attached media", async () => {
      let capturedPatchPayload: UpdateContentBlockRequest | null = null;
      server.use(
        http.patch(
          `${env.apiBaseUrl}/api/v1/admin/content-blocks/:id`,
          async ({ request }) => {
            capturedPatchPayload =
              (await request.json()) as UpdateContentBlockRequest;
            return HttpResponse.json({
              data: {
                id: VALID_BLOCK_ID,
                spa_section_id: VALID_SECTION_ID,
                section_key: "about-us",
                block_type: "text_image",
                title: "Ensemble Photo",
                text: "Original Text",
                media: null,
                sort_order: 10,
                is_visible: true,
                created_at: "2026-01-01T00:00:00Z",
                updated_at: "2026-01-01T00:00:00Z",
              },
            });
          },
        ),
      );

      const block: AdminContentBlockDto = {
        id: VALID_BLOCK_ID,
        spa_section_id: VALID_SECTION_ID,
        section_key: "about-us",
        block_type: "text_image",
        title: "Ensemble Photo",
        text: "Original Text",
        media: [
          {
            id: "22222222-2222-4222-8222-222222222221",
            media_type: "image",
            storage_provider: "local",
            original_filename: "photo.jpg",
          },
        ],
        sort_order: 10,
        is_visible: true,
        translations: {
          en: { title: "Ensemble Photo", text: "Original Text" },
          de: null,
        },
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      };

      const onClose = vi.fn();
      renderWithClient(
        <ContentBlockEditModal
          block={block}
          sections={sampleAdminSections}
          isOpen={true}
          onClose={onClose}
        />,
      );

      // Change only English text
      fireEvent.change(screen.getByLabelText("Text Content *"), {
        target: { value: "Updated English Text Only" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });

      // Media IDs must remain preserved
      expect(
        (capturedPatchPayload as UpdateContentBlockRequest | null)?.media_ids,
      ).toEqual(["22222222-2222-4222-8222-222222222221"]);
    });
  });

  describe("5. Storage Safety and Auth Isolation", () => {
    it("Section 86 & 87: locale in localStorage has no effect on auth token storage", () => {
      // Store public locale
      setStoredLocale("de");
      expect(localStorage.getItem("spa.locale")).toBe("de");

      // Verify NO auth token exists in localStorage or sessionStorage
      expect(localStorage.getItem("access_token")).toBeNull();
      expect(localStorage.getItem("token")).toBeNull();
      expect(localStorage.getItem("refresh_token")).toBeNull();
      expect(sessionStorage.getItem("access_token")).toBeNull();

      // Ensure authSession is strictly in-memory
      authSession.setAccessToken("test-mem-token");
      expect(authSession.getAccessToken()).toBe("test-mem-token");
      expect(localStorage.getItem("test-mem-token")).toBeNull();
      expect(localStorage.getItem("access_token")).toBeNull();
    });
  });

  describe("6. Multilingual Navigation Labels and Menus (V1.1)", () => {
    it("Section 40: renders English navigation labels in public menu", async () => {
      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/public/page`, () => {
          return HttpResponse.json(mockEnglishPublicPage);
        }),
      );

      renderWithClient(<PublicPage />);
      await screen.findByRole("heading", { name: "About Us" });

      const desktopNav = document.getElementById("public-desktop-navigation");
      expect(desktopNav).toBeInTheDocument();
      expect(desktopNav).toHaveTextContent("About Us");
      expect(desktopNav).toHaveTextContent("Contact");
    });

    it("Section 41 & 42: updates navigation labels and keeps menu + content in same German locale", async () => {
      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/public/page`, ({ request }) => {
          const url = new URL(request.url);
          const loc = url.searchParams.get("locale");
          if (loc === "de") {
            return HttpResponse.json(mockGermanPublicPage);
          }
          return HttpResponse.json(mockEnglishPublicPage);
        }),
      );

      renderWithClient(<PublicPage />);
      await screen.findByRole("heading", { name: "About Us" });

      const deBtn = screen.getAllByTestId("lang-switch-de")[0]!;
      fireEvent.click(deBtn);

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: "Über uns" }),
        ).toBeInTheDocument();
      });

      const desktopNav = document.getElementById("public-desktop-navigation");
      expect(desktopNav).toHaveTextContent("Über uns");
      expect(desktopNav).toHaveTextContent("Kontakt");
      expect(desktopNav).not.toHaveTextContent("Contact");
    });

    it("Section 43: renders backend fallback navigation label directly without frontend mangling", async () => {
      const fallbackNavResponse = {
        data: {
          ...mockGermanPublicPage.data,
          sections: [
            {
              ...mockGermanPublicPage.data.sections[0],
              title: "Über uns",
              navigation_label: "About", // Backend fallback to English navigation label
            },
          ],
        },
      };

      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/public/page`, () => {
          return HttpResponse.json(fallbackNavResponse);
        }),
      );

      localStorage.setItem(LOCALE_STORAGE_KEY, "de");
      renderWithClient(<PublicPage />);

      await screen.findByRole("heading", { name: "Über uns" });
      const desktopNav = document.getElementById("public-desktop-navigation");
      expect(desktopNav).toHaveTextContent("About");
    });

    it("Section 44: switching EN -> DE -> EN leaves navigation label English", async () => {
      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/public/page`, ({ request }) => {
          const url = new URL(request.url);
          const loc = url.searchParams.get("locale");
          if (loc === "de") {
            return HttpResponse.json(mockGermanPublicPage);
          }
          return HttpResponse.json(mockEnglishPublicPage);
        }),
      );

      renderWithClient(<PublicPage />);
      await screen.findByRole("heading", { name: "About Us" });

      const deBtn = screen.getAllByTestId("lang-switch-de")[0]!;
      const enBtn = screen.getAllByTestId("lang-switch-en")[0]!;

      fireEvent.click(deBtn);
      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: "Über uns" }),
        ).toBeInTheDocument();
      });

      fireEvent.click(enBtn);
      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: "About Us" }),
        ).toBeInTheDocument();
      });

      const desktopNav = document.getElementById("public-desktop-navigation");
      expect(desktopNav).toHaveTextContent("Contact");
      expect(desktopNav).not.toHaveTextContent("Kontakt");
    });

    it("Section 45: mobile menu renders localized navigation labels", async () => {
      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/public/page`, () => {
          return HttpResponse.json(mockGermanPublicPage);
        }),
      );

      localStorage.setItem(LOCALE_STORAGE_KEY, "de");
      renderWithClient(<PublicPage />);

      await screen.findByRole("heading", { name: "Über uns" });
      const mobileNav = document.getElementById("public-mobile-navigation");
      expect(mobileNav).toBeInTheDocument();
      expect(mobileNav).toHaveTextContent("Über uns");
      expect(mobileNav).toHaveTextContent("Kontakt");
    });

    it("Section 46: renders localized aria-label for navigation", async () => {
      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/public/page`, ({ request }) => {
          const url = new URL(request.url);
          const loc = url.searchParams.get("locale");
          if (loc === "de") {
            return HttpResponse.json(mockGermanPublicPage);
          }
          return HttpResponse.json(mockEnglishPublicPage);
        }),
      );

      renderWithClient(<PublicPage />);
      await screen.findByRole("heading", { name: "About Us" });

      const desktopNav = document.getElementById("public-desktop-navigation");
      expect(desktopNav).toHaveAttribute("aria-label", "Main navigation");

      const deBtn = screen.getAllByTestId("lang-switch-de")[0]!;
      fireEvent.click(deBtn);

      await waitFor(() => {
        expect(desktopNav).toHaveAttribute("aria-label", "Hauptnavigation");
      });
    });

    it("Section 47 & 48: loads admin EN and DE name and navigation_label in respective tabs", () => {
      const section: AdminSpaSectionDto = {
        id: VALID_SECTION_ID,
        key: "about-us",
        title: "About Us",
        navigation_label: "About",
        sort_order: 10,
        is_visible: true,
        content_block_count: 1,
        translations: {
          en: { name: "About Us", navigation_label: "About" },
          de: { name: "Über uns", navigation_label: "Über uns Nav" },
        },
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      };

      renderWithClient(
        <SpaSectionEditModal
          section={section}
          isOpen={true}
          onClose={vi.fn()}
        />,
      );

      // EN tab values
      expect(screen.getByTestId("edit-section-name-en")).toHaveValue(
        "About Us",
      );
      expect(screen.getByTestId("edit-section-nav-en")).toHaveValue("About");

      // Switch to DE tab
      fireEvent.click(screen.getByRole("tab", { name: /Deutsch/i }));
      expect(screen.getByTestId("edit-section-name-de")).toHaveValue(
        "Über uns",
      );
      expect(screen.getByTestId("edit-section-nav-de")).toHaveValue(
        "Über uns Nav",
      );
    });

    it("Section 49: admin DE with null navigation_label displays blank German nav input (no English fallback)", () => {
      const section: AdminSpaSectionDto = {
        id: VALID_SECTION_ID,
        key: "about-us",
        title: "About Us",
        navigation_label: "About",
        sort_order: 10,
        is_visible: true,
        content_block_count: 1,
        translations: {
          en: { name: "About Us", navigation_label: "About" },
          de: { name: "Über uns", navigation_label: null },
        },
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      };

      renderWithClient(
        <SpaSectionEditModal
          section={section}
          isOpen={true}
          onClose={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByRole("tab", { name: /Deutsch/i }));
      expect(screen.getByTestId("edit-section-name-de")).toHaveValue(
        "Über uns",
      );
      expect(screen.getByTestId("edit-section-nav-de")).toHaveValue("");
    });

    it("Section 50: admin DE completely absent shows blank German name and nav inputs", () => {
      const section: AdminSpaSectionDto = {
        id: VALID_SECTION_ID,
        key: "about-us",
        title: "About Us",
        navigation_label: "About",
        sort_order: 10,
        is_visible: true,
        content_block_count: 1,
        translations: {
          en: { name: "About Us", navigation_label: "About" },
          de: null,
        },
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      };

      renderWithClient(
        <SpaSectionEditModal
          section={section}
          isOpen={true}
          onClose={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByRole("tab", { name: /Deutsch/i }));
      expect(screen.getByTestId("edit-section-name-de")).toHaveValue("");
      expect(screen.getByTestId("edit-section-nav-de")).toHaveValue("");
    });

    it("Section 51: creates section with EN only including navigation_label", async () => {
      let capturedPayload: unknown = null;
      server.use(
        http.post(
          `${env.apiBaseUrl}/api/v1/admin/spa-sections`,
          async ({ request }) => {
            capturedPayload = await request.json();
            return HttpResponse.json({
              data: {
                id: VALID_SECTION_ID,
                key: "about-us",
                title: "About Us",
                sort_order: 10,
                is_visible: true,
                created_at: "2026-01-01T00:00:00Z",
                updated_at: "2026-01-01T00:00:00Z",
              },
            });
          },
        ),
      );

      const onClose = vi.fn();
      renderWithClient(
        <SpaSectionCreateModal isOpen={true} onClose={onClose} />,
      );

      fireEvent.change(screen.getByTestId("create-section-name-en"), {
        target: { value: "About Us" },
      });
      fireEvent.change(screen.getByTestId("create-section-nav-en"), {
        target: { value: "About" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Create Section" }));

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });

      expect(capturedPayload).toEqual({
        title: "About Us",
        name: "About Us",
        navigation_label: "About",
        translations: {
          en: {
            name: "About Us",
            navigation_label: "About",
          },
        },
      });
    });

    it("Section 52: creates section with both EN and DE localized navigation labels", async () => {
      let capturedPayload: unknown = null;
      server.use(
        http.post(
          `${env.apiBaseUrl}/api/v1/admin/spa-sections`,
          async ({ request }) => {
            capturedPayload = await request.json();
            return HttpResponse.json({
              data: {
                id: VALID_SECTION_ID,
                key: "about-us",
                title: "About Us",
                sort_order: 10,
                is_visible: true,
                created_at: "2026-01-01T00:00:00Z",
                updated_at: "2026-01-01T00:00:00Z",
              },
            });
          },
        ),
      );

      const onClose = vi.fn();
      renderWithClient(
        <SpaSectionCreateModal isOpen={true} onClose={onClose} />,
      );

      // EN
      fireEvent.change(screen.getByTestId("create-section-name-en"), {
        target: { value: "About Us" },
      });
      fireEvent.change(screen.getByTestId("create-section-nav-en"), {
        target: { value: "About" },
      });

      // DE
      fireEvent.click(screen.getByRole("tab", { name: /Deutsch/i }));
      fireEvent.change(screen.getByTestId("create-section-name-de"), {
        target: { value: "Über uns" },
      });
      fireEvent.change(screen.getByTestId("create-section-nav-de"), {
        target: { value: "Über uns Nav" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Create Section" }));

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });

      expect(capturedPayload).toEqual({
        title: "About Us",
        name: "About Us",
        navigation_label: "About",
        translations: {
          en: {
            name: "About Us",
            navigation_label: "About",
          },
          de: {
            name: "Über uns",
            navigation_label: "Über uns Nav",
          },
        },
      });
    });

    it("Section 53: partial PATCH updating only DE navigation label preserves DE name and EN", async () => {
      let capturedPatchPayload: unknown = null;
      server.use(
        http.patch(
          `${env.apiBaseUrl}/api/v1/admin/spa-sections/:id`,
          async ({ request }) => {
            capturedPatchPayload = await request.json();
            return HttpResponse.json({
              data: {
                id: VALID_SECTION_ID,
                key: "about-us",
                title: "About Us",
                sort_order: 10,
                is_visible: true,
                created_at: "2026-01-01T00:00:00Z",
                updated_at: "2026-01-01T00:00:00Z",
              },
            });
          },
        ),
      );

      const section: AdminSpaSectionDto = {
        id: VALID_SECTION_ID,
        key: "about-us",
        title: "About Us",
        navigation_label: "About",
        sort_order: 10,
        is_visible: true,
        content_block_count: 0,
        translations: {
          en: { name: "About Us", navigation_label: "About" },
          de: { name: "Über uns", navigation_label: "Über uns Alt" },
        },
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      };

      const onClose = vi.fn();
      renderWithClient(
        <SpaSectionEditModal
          section={section}
          isOpen={true}
          onClose={onClose}
        />,
      );

      fireEvent.click(screen.getByRole("tab", { name: /Deutsch/i }));
      fireEvent.change(screen.getByTestId("edit-section-nav-de"), {
        target: { value: "Info" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });

      expect(capturedPatchPayload).toEqual({
        translations: {
          de: {
            navigation_label: "Info",
          },
        },
      });
    });

    it("Section 54: partial PATCH updating only DE name preserves DE navigation label", async () => {
      let capturedPatchPayload: unknown = null;
      server.use(
        http.patch(
          `${env.apiBaseUrl}/api/v1/admin/spa-sections/:id`,
          async ({ request }) => {
            capturedPatchPayload = await request.json();
            return HttpResponse.json({
              data: {
                id: VALID_SECTION_ID,
                key: "about-us",
                title: "About Us",
                sort_order: 10,
                is_visible: true,
                created_at: "2026-01-01T00:00:00Z",
                updated_at: "2026-01-01T00:00:00Z",
              },
            });
          },
        ),
      );

      const section: AdminSpaSectionDto = {
        id: VALID_SECTION_ID,
        key: "about-us",
        title: "About Us",
        navigation_label: "About",
        sort_order: 10,
        is_visible: true,
        content_block_count: 0,
        translations: {
          en: { name: "About Us", navigation_label: "About" },
          de: { name: "Über uns", navigation_label: "Info" },
        },
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      };

      const onClose = vi.fn();
      renderWithClient(
        <SpaSectionEditModal
          section={section}
          isOpen={true}
          onClose={onClose}
        />,
      );

      fireEvent.click(screen.getByRole("tab", { name: /Deutsch/i }));
      fireEvent.change(screen.getByTestId("edit-section-name-de"), {
        target: { value: "Über mich" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });

      expect(capturedPatchPayload).toEqual({
        translations: {
          de: {
            name: "Über mich",
          },
        },
      });
    });

    it("Section 55: partial PATCH updating only EN navigation label leaves DE untouched", async () => {
      let capturedPatchPayload: unknown = null;
      server.use(
        http.patch(
          `${env.apiBaseUrl}/api/v1/admin/spa-sections/:id`,
          async ({ request }) => {
            capturedPatchPayload = await request.json();
            return HttpResponse.json({
              data: {
                id: VALID_SECTION_ID,
                key: "about-us",
                title: "About Us",
                sort_order: 10,
                is_visible: true,
                created_at: "2026-01-01T00:00:00Z",
                updated_at: "2026-01-01T00:00:00Z",
              },
            });
          },
        ),
      );

      const section: AdminSpaSectionDto = {
        id: VALID_SECTION_ID,
        key: "about-us",
        title: "About Us",
        navigation_label: "About",
        sort_order: 10,
        is_visible: true,
        content_block_count: 0,
        translations: {
          en: { name: "About Us", navigation_label: "About" },
          de: { name: "Über uns", navigation_label: "Über uns" },
        },
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      };

      const onClose = vi.fn();
      renderWithClient(
        <SpaSectionEditModal
          section={section}
          isOpen={true}
          onClose={onClose}
        />,
      );

      fireEvent.change(screen.getByTestId("edit-section-nav-en"), {
        target: { value: "About New" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });

      expect(capturedPatchPayload).toEqual({
        navigation_label: "About New",
        translations: {
          en: {
            navigation_label: "About New",
          },
        },
      });
    });

    it("Section 56: verifies no shared navigation-label input exists outside locale tabs", () => {
      renderWithClient(
        <SpaSectionCreateModal isOpen={true} onClose={vi.fn()} />,
      );

      // In EN tab, only EN navigation input is present
      expect(screen.getByTestId("create-section-nav-en")).toBeInTheDocument();
      expect(
        screen.queryByTestId("create-section-nav-de"),
      ).not.toBeInTheDocument();

      // Switch to DE tab
      fireEvent.click(screen.getByRole("tab", { name: /Deutsch/i }));
      expect(screen.getByTestId("create-section-nav-de")).toBeInTheDocument();
      expect(
        screen.queryByTestId("create-section-nav-en"),
      ).not.toBeInTheDocument();
    });
  });

  describe("7. German Translation Validation (V1.2)", () => {
    describe("validateGermanSectionTranslation helper", () => {
      it("allows omitted German translation when creating (both empty)", () => {
        expect(
          validateGermanSectionTranslation({
            exists: false,
            name: "",
            navigationLabel: "",
          }),
        ).toBeNull();
      });

      it("allows German translation with name only when creating", () => {
        expect(
          validateGermanSectionTranslation({
            exists: false,
            name: "Über uns",
            navigationLabel: "",
          }),
        ).toBeNull();
      });

      it("allows German translation with name and navigation label when creating", () => {
        expect(
          validateGermanSectionTranslation({
            exists: false,
            name: "Über uns",
            navigationLabel: "Über uns Nav",
          }),
        ).toBeNull();
      });

      it("rejects nav-only German translation when creating", () => {
        expect(
          validateGermanSectionTranslation({
            exists: false,
            name: "",
            navigationLabel: "Über uns",
          }),
        ).toBe(
          "German section name is required when creating a German translation.",
        );
      });

      it("allows updating existing German translation nav only", () => {
        expect(
          validateGermanSectionTranslation({
            exists: true,
            name: "Über uns",
            navigationLabel: "Info",
          }),
        ).toBeNull();
      });

      it("allows updating existing German translation name only", () => {
        expect(
          validateGermanSectionTranslation({
            exists: true,
            name: "Über uns neu",
            navigationLabel: "Über uns",
          }),
        ).toBeNull();
      });

      it("rejects clearing German name while navigation label remains on existing translation", () => {
        expect(
          validateGermanSectionTranslation({
            exists: true,
            name: "",
            navigationLabel: "Info",
          }),
        ).toBe("German section name is required.");
      });
    });

    it("Section 25: Create EN only calls API once and omits DE translation", async () => {
      let callCount = 0;
      let capturedPayload: unknown = null;
      server.use(
        http.post(
          `${env.apiBaseUrl}/api/v1/admin/spa-sections`,
          async ({ request }) => {
            callCount += 1;
            capturedPayload = await request.json();
            return HttpResponse.json({
              data: {
                id: VALID_SECTION_ID,
                key: "about-us",
                title: "About Us",
                sort_order: 10,
                is_visible: true,
                created_at: "2026-01-01T00:00:00Z",
                updated_at: "2026-01-01T00:00:00Z",
              },
            });
          },
        ),
      );

      const onClose = vi.fn();
      renderWithClient(
        <SpaSectionCreateModal isOpen={true} onClose={onClose} />,
      );

      fireEvent.change(screen.getByTestId("create-section-name-en"), {
        target: { value: "About Us" },
      });
      fireEvent.change(screen.getByTestId("create-section-nav-en"), {
        target: { value: "About" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Create Section" }));

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });

      expect(callCount).toBe(1);
      expect(capturedPayload).toEqual({
        title: "About Us",
        name: "About Us",
        navigation_label: "About",
        translations: {
          en: {
            name: "About Us",
            navigation_label: "About",
          },
        },
      });
    });

    it("Section 26: Create DE nav-only is invalid, shows validation error, API NOT called", async () => {
      let callCount = 0;
      server.use(
        http.post(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
          callCount += 1;
          return HttpResponse.json({ data: {} });
        }),
      );

      const onClose = vi.fn();
      renderWithClient(
        <SpaSectionCreateModal isOpen={true} onClose={onClose} />,
      );

      // EN filled
      fireEvent.change(screen.getByTestId("create-section-name-en"), {
        target: { value: "About Us" },
      });

      // DE nav only, name blank
      fireEvent.click(screen.getByRole("tab", { name: /Deutsch/i }));
      fireEvent.change(screen.getByTestId("create-section-nav-de"), {
        target: { value: "Über uns" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Create Section" }));

      // Validation error shown
      await waitFor(() => {
        expect(
          screen.getByText(
            "German section name is required when creating a German translation.",
          ),
        ).toBeInTheDocument();
      });

      // API was NOT called
      expect(callCount).toBe(0);
      expect(onClose).not.toHaveBeenCalled();
    });

    it("Section 27: Create DE name-only is valid and sends valid DE payload", async () => {
      let callCount = 0;
      let capturedPayload: unknown = null;
      server.use(
        http.post(
          `${env.apiBaseUrl}/api/v1/admin/spa-sections`,
          async ({ request }) => {
            callCount += 1;
            capturedPayload = await request.json();
            return HttpResponse.json({
              data: {
                id: VALID_SECTION_ID,
                key: "about-us",
                title: "About Us",
                sort_order: 10,
                is_visible: true,
                created_at: "2026-01-01T00:00:00Z",
                updated_at: "2026-01-01T00:00:00Z",
              },
            });
          },
        ),
      );

      const onClose = vi.fn();
      renderWithClient(
        <SpaSectionCreateModal isOpen={true} onClose={onClose} />,
      );

      fireEvent.change(screen.getByTestId("create-section-name-en"), {
        target: { value: "About Us" },
      });
      fireEvent.change(screen.getByTestId("create-section-nav-en"), {
        target: { value: "About" },
      });

      fireEvent.click(screen.getByRole("tab", { name: /Deutsch/i }));
      fireEvent.change(screen.getByTestId("create-section-name-de"), {
        target: { value: "Über uns" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Create Section" }));

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });

      expect(callCount).toBe(1);
      expect(capturedPayload).toEqual({
        title: "About Us",
        name: "About Us",
        navigation_label: "About",
        translations: {
          en: {
            name: "About Us",
            navigation_label: "About",
          },
          de: {
            name: "Über uns",
          },
        },
      });
    });

    it("Section 28: Create DE name + nav is valid and sends both in payload", async () => {
      let callCount = 0;
      let capturedPayload: unknown = null;
      server.use(
        http.post(
          `${env.apiBaseUrl}/api/v1/admin/spa-sections`,
          async ({ request }) => {
            callCount += 1;
            capturedPayload = await request.json();
            return HttpResponse.json({
              data: {
                id: VALID_SECTION_ID,
                key: "about-us",
                title: "About Us",
                sort_order: 10,
                is_visible: true,
                created_at: "2026-01-01T00:00:00Z",
                updated_at: "2026-01-01T00:00:00Z",
              },
            });
          },
        ),
      );

      const onClose = vi.fn();
      renderWithClient(
        <SpaSectionCreateModal isOpen={true} onClose={onClose} />,
      );

      fireEvent.change(screen.getByTestId("create-section-name-en"), {
        target: { value: "About Us" },
      });
      fireEvent.change(screen.getByTestId("create-section-nav-en"), {
        target: { value: "About" },
      });

      fireEvent.click(screen.getByRole("tab", { name: /Deutsch/i }));
      fireEvent.change(screen.getByTestId("create-section-name-de"), {
        target: { value: "Über uns" },
      });
      fireEvent.change(screen.getByTestId("create-section-nav-de"), {
        target: { value: "Über uns Nav" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Create Section" }));

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });

      expect(callCount).toBe(1);
      expect(capturedPayload).toEqual({
        title: "About Us",
        name: "About Us",
        navigation_label: "About",
        translations: {
          en: {
            name: "About Us",
            navigation_label: "About",
          },
          de: {
            name: "Über uns",
            navigation_label: "Über uns Nav",
          },
        },
      });
    });

    it("Section 29: Edit missing DE with nav-only is invalid, shows validation error, PATCH API NOT called", async () => {
      let patchCount = 0;
      server.use(
        http.patch(`${env.apiBaseUrl}/api/v1/admin/spa-sections/:id`, () => {
          patchCount += 1;
          return HttpResponse.json({ data: {} });
        }),
      );

      // Section with NO German translation
      const section: AdminSpaSectionDto = {
        id: VALID_SECTION_ID,
        key: "about-us",
        title: "About Us",
        navigation_label: "About",
        sort_order: 10,
        is_visible: true,
        content_block_count: 0,
        translations: {
          en: { name: "About Us", navigation_label: "About" },
          de: null,
        },
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      };

      const onClose = vi.fn();
      renderWithClient(
        <SpaSectionEditModal
          section={section}
          isOpen={true}
          onClose={onClose}
        />,
      );

      fireEvent.click(screen.getByRole("tab", { name: /Deutsch/i }));
      // Leave German name blank, fill only navigation label
      fireEvent.change(screen.getByTestId("edit-section-nav-de"), {
        target: { value: "Über uns" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

      // Validation error shown
      await waitFor(() => {
        expect(
          screen.getByText(
            "German section name is required when creating a German translation.",
          ),
        ).toBeInTheDocument();
      });

      // PATCH was NOT called
      expect(patchCount).toBe(0);
      expect(onClose).not.toHaveBeenCalled();
    });

    it("Section 30: Edit missing DE with name-only is valid and sends new DE translation payload", async () => {
      let patchCount = 0;
      let capturedPatchPayload: unknown = null;
      server.use(
        http.patch(
          `${env.apiBaseUrl}/api/v1/admin/spa-sections/:id`,
          async ({ request }) => {
            patchCount += 1;
            capturedPatchPayload = await request.json();
            return HttpResponse.json({
              data: {
                id: VALID_SECTION_ID,
                key: "about-us",
                title: "About Us",
                sort_order: 10,
                is_visible: true,
                created_at: "2026-01-01T00:00:00Z",
                updated_at: "2026-01-01T00:00:00Z",
              },
            });
          },
        ),
      );

      const section: AdminSpaSectionDto = {
        id: VALID_SECTION_ID,
        key: "about-us",
        title: "About Us",
        navigation_label: "About",
        sort_order: 10,
        is_visible: true,
        content_block_count: 0,
        translations: {
          en: { name: "About Us", navigation_label: "About" },
          de: null,
        },
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      };

      const onClose = vi.fn();
      renderWithClient(
        <SpaSectionEditModal
          section={section}
          isOpen={true}
          onClose={onClose}
        />,
      );

      fireEvent.click(screen.getByRole("tab", { name: /Deutsch/i }));
      fireEvent.change(screen.getByTestId("edit-section-name-de"), {
        target: { value: "Über uns" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });

      expect(patchCount).toBe(1);
      expect(capturedPatchPayload).toEqual({
        translations: {
          de: {
            name: "Über uns",
          },
        },
      });
    });

    it("Section 31: Edit existing DE with nav-only is valid, calls PATCH and preserves DE name and EN", async () => {
      let patchCount = 0;
      let capturedPatchPayload: unknown = null;
      server.use(
        http.patch(
          `${env.apiBaseUrl}/api/v1/admin/spa-sections/:id`,
          async ({ request }) => {
            patchCount += 1;
            capturedPatchPayload = await request.json();
            return HttpResponse.json({
              data: {
                id: VALID_SECTION_ID,
                key: "about-us",
                title: "About Us",
                sort_order: 10,
                is_visible: true,
                created_at: "2026-01-01T00:00:00Z",
                updated_at: "2026-01-01T00:00:00Z",
              },
            });
          },
        ),
      );

      const section: AdminSpaSectionDto = {
        id: VALID_SECTION_ID,
        key: "about-us",
        title: "About Us",
        navigation_label: "About",
        sort_order: 10,
        is_visible: true,
        content_block_count: 0,
        translations: {
          en: { name: "About Us", navigation_label: "About" },
          de: { name: "Über uns", navigation_label: "About" },
        },
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      };

      const onClose = vi.fn();
      renderWithClient(
        <SpaSectionEditModal
          section={section}
          isOpen={true}
          onClose={onClose}
        />,
      );

      fireEvent.click(screen.getByRole("tab", { name: /Deutsch/i }));
      // Change only DE navigation label
      fireEvent.change(screen.getByTestId("edit-section-nav-de"), {
        target: { value: "Info" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });

      expect(patchCount).toBe(1);
      expect(capturedPatchPayload).toEqual({
        translations: {
          de: {
            navigation_label: "Info",
          },
        },
      });
    });

    it("Section 32: Edit existing DE with name-only is valid and preserves DE nav", async () => {
      let patchCount = 0;
      let capturedPatchPayload: unknown = null;
      server.use(
        http.patch(
          `${env.apiBaseUrl}/api/v1/admin/spa-sections/:id`,
          async ({ request }) => {
            patchCount += 1;
            capturedPatchPayload = await request.json();
            return HttpResponse.json({
              data: {
                id: VALID_SECTION_ID,
                key: "about-us",
                title: "About Us",
                sort_order: 10,
                is_visible: true,
                created_at: "2026-01-01T00:00:00Z",
                updated_at: "2026-01-01T00:00:00Z",
              },
            });
          },
        ),
      );

      const section: AdminSpaSectionDto = {
        id: VALID_SECTION_ID,
        key: "about-us",
        title: "About Us",
        navigation_label: "About",
        sort_order: 10,
        is_visible: true,
        content_block_count: 0,
        translations: {
          en: { name: "About Us", navigation_label: "About" },
          de: { name: "Über uns", navigation_label: "Info" },
        },
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      };

      const onClose = vi.fn();
      renderWithClient(
        <SpaSectionEditModal
          section={section}
          isOpen={true}
          onClose={onClose}
        />,
      );

      fireEvent.click(screen.getByRole("tab", { name: /Deutsch/i }));
      // Change only DE section name
      fireEvent.change(screen.getByTestId("edit-section-name-de"), {
        target: { value: "Über uns neu" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });

      expect(patchCount).toBe(1);
      expect(capturedPatchPayload).toEqual({
        translations: {
          de: {
            name: "Über uns neu",
          },
        },
      });
    });

    it("Section 33: No EN regression when German translation validation is triggered or saved", () => {
      // Unit assertion ensuring validation logic operates solely on German fields
      expect(
        validateGermanSectionTranslation({
          exists: false,
          name: "",
          navigationLabel: "Über uns",
        }),
      ).toBe(
        "German section name is required when creating a German translation.",
      );

      expect(
        validateGermanSectionTranslation({
          exists: false,
          name: "Über uns",
          navigationLabel: "",
        }),
      ).toBeNull();
    });
  });
});
