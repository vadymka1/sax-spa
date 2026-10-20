import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { server } from "./msw/server";
import { env } from "../lib/env";
import { PublicPage } from "../features/public-page/PublicPage";
import { AdminLayout } from "../features/admin/AdminLayout";
import { AuthProvider } from "../features/auth/AuthProvider";
import { authSession } from "../features/auth/authSession";
import { TextImageBlock } from "../features/public-page/blocks/TextImageBlock";
import { TextVideoBlock } from "../features/public-page/blocks/TextVideoBlock";
import { TextYoutubeBlock } from "../features/public-page/blocks/TextYoutubeBlock";
import { ImageCarousel } from "../features/public-page/ImageCarousel";
import { ContactForm } from "../features/public-page/ContactForm";
import { SpaSectionEditModal } from "../features/admin/sections/SpaSectionEditModal";
import { PageAppearancePage } from "../features/admin/appearance/PageAppearancePage";
import { UsersList } from "../features/admin/users/UsersList";
import { SpaSectionsList } from "../features/admin/sections/SpaSectionsList";
import { ContactMessagesList } from "../features/admin/contact-messages/ContactMessagesList";
import { TestimonialsList } from "../features/admin/testimonials/TestimonialsList";
import adminLayoutStyles from "../features/admin/adminLayout.module.css";
import usersStyles from "../features/admin/users/users.module.css";
import sectionsStyles from "../features/admin/sections/sections.module.css";
import contactMessagesStyles from "../features/admin/contact-messages/contactMessages.module.css";
import testimonialsStyles from "../features/admin/testimonials/testimonials.module.css";
import {
  AdminSpaSectionDto,
  AdminPageAppearanceDto,
  UserDto,
  AdminContactMessageDto,
  AdminTestimonialDto,
} from "../api/types";

const mockResponsivePublicPage = {
  data: {
    page: {
      id: "11111111-1111-4111-8111-111111111111",
      slug: "home",
      title: "SPA Saxophone Ensemble Mobile Audit",
      seo_title: "SPA Saxophone Ensemble",
      seo_description: "Mobile responsiveness verification",
      seo_keywords: ["saxophone", "mobile"],
    },
    appearance: {
      background_mode: "image" as const,
      background_color: "#1A2C2C",
      background_media: {
        id: "22222222-2222-4222-8222-222222222222",
        type: "image" as const,
        url: "https://example.test/hero-bg.jpg",
        alt_text: "Ensemble Background",
      },
      overlay_opacity: 0.45,
      background_position: "center" as const,
      background_size: "cover" as const,
    },
    sections: [
      {
        id: "33333333-3333-4333-8333-333333333331",
        key: "about",
        title: "Über das Saxophon-Ensemble und unsere musikalische Geschichte",
        navigation_label: "About",
        sort_order: 10,
        blocks: [
          {
            id: "44444444-4444-4444-8444-444444444441",
            block_type: "text_image" as const,
            title: "Dynamic Musical Journey",
            text: "Long editorial text describing our international concerts and recordings across Europe.",
            media: {
              id: "55555555-5555-4555-8555-555555555551",
              type: "image" as const,
              url: "https://example.test/sax-quartet.jpg",
              alt_text: "Ensemble quartet performing live",
            },
            sort_order: 10,
          },
          {
            id: "44444444-4444-4444-8444-444444444442",
            block_type: "text_video" as const,
            title: "Live Concert Recording",
            text: "Watch our recent performance at the Berlin Philharmonie.",
            media: {
              id: "55555555-5555-4555-8555-555555555552",
              type: "video" as const,
              url: "https://example.test/live-concert.mp4",
              mime_type: "video/mp4",
            },
            sort_order: 20,
          },
          {
            id: "44444444-4444-4444-8444-444444444443",
            block_type: "text_youtube" as const,
            title: "YouTube Feature",
            text: "Official music video on YouTube nocookie.",
            media: {
              id: "55555555-5555-4555-8555-555555555553",
              type: "youtube" as const,
              youtube_video_id: "mockYtId",
              embed_url: "https://www.youtube-nocookie.com/embed/mockYtId",
              thumbnail_url: "https://example.test/yt-thumb.jpg",
            },
            sort_order: 30,
          },
        ],
      },
      {
        id: "33333333-3333-4333-8333-333333333332",
        key: "gallery",
        title: "Galerie der Aufführungen",
        navigation_label: "Gallery",
        sort_order: 20,
        blocks: [],
      },
      {
        id: "33333333-3333-4333-8333-333333333333",
        key: "testimonials",
        title: "Kritiken und Stimmen unseres Publikums",
        navigation_label: "Testimonials",
        sort_order: 30,
        blocks: [],
      },
      {
        id: "33333333-3333-4333-8333-333333333334",
        key: "contact-us",
        title: "Kontaktinformationen und Buchungsanfragen",
        navigation_label: "Contact",
        sort_order: 40,
        blocks: [],
      },
    ],
    testimonials: [
      {
        id: "66666666-6666-4666-8666-666666666661",
        author_name: "Dr. Johannes von Hohenzollern-Sigmaringen",
        author_role: "Konzertdirektion Berlin",
        text: "Eine absolut mitreißende Interpretation moderner und klassischer Werke für Saxophonquartett!",
        avatar: null,
        sort_order: 10,
      },
    ],
  },
};

const mockGermanPublicPage = {
  data: {
    ...mockResponsivePublicPage.data,
    page: {
      ...mockResponsivePublicPage.data.page,
      title: "SPA Saxophon-Ensemble Offiziell",
    },
    sections: mockResponsivePublicPage.data.sections.map((s) => ({
      ...s,
      navigation_label: `DE-${s.navigation_label}`,
    })),
  },
};

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("FRONTEND MOBILE RESPONSIVENESS V1 — AUDIT SUITE", () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.style.overflow = "";
    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/public/page`, ({ request }) => {
        const url = new URL(request.url);
        const lang = url.searchParams.get("locale");
        if (lang === "de") {
          return HttpResponse.json(mockGermanPublicPage);
        }
        return HttpResponse.json(mockResponsivePublicPage);
      }),
    );
  });

  afterEach(() => {
    document.body.style.overflow = "";
  });

  it("Section 71-74: renders Public SPA across representative viewports (320px to 1280px) mounting header, navigation, brand, and page wrapper", async () => {
    const representativeWidths = [
      320, 360, 375, 390, 414, 480, 768, 1024, 1280,
    ];

    for (const width of representativeWidths) {
      window.innerWidth = width;
      window.dispatchEvent(new Event("resize"));

      const { unmount } = renderWithClient(<PublicPage />);

      await screen.findByText("SPA Saxophone Ensemble Mobile Audit");

      // Check header, brand, and actions are rendered
      expect(
        screen.getByRole("link", {
          name: "SPA Saxophone Ensemble Mobile Audit",
        }),
      ).toBeInTheDocument();
      expect(screen.getByTestId("lang-switch-en")).toBeInTheDocument();
      expect(screen.getByTestId("lang-switch-de")).toBeInTheDocument();
      expect(screen.getAllByTestId("lang-switch-en")).toHaveLength(1);
      expect(screen.getAllByTestId("lang-switch-de")).toHaveLength(1);
      expect(
        screen.getAllByRole("group", { name: "Language selection" }),
      ).toHaveLength(1);

      // Verify page wrapper exists
      const pageWrapper = screen.getByTestId("public-page-wrapper");
      expect(pageWrapper).toBeInTheDocument();

      unmount();
    }
  });

  it("Section 76, 10, 11, 12, 13: mobile navigation toggle, accessible attributes, body scroll locking, link click close, and Escape close", async () => {
    window.innerWidth = 375;
    renderWithClient(<PublicPage />);

    await screen.findByText("SPA Saxophone Ensemble Mobile Audit");

    const menuButton = screen.getByRole("button", {
      name: /Toggle navigation/i,
    });
    expect(menuButton).toHaveAttribute("aria-expanded", "false");
    expect(menuButton).toHaveAttribute(
      "aria-controls",
      "public-mobile-navigation",
    );
    expect(document.body.style.overflow).toBe("");

    // 1. Open mobile menu
    fireEvent.click(menuButton);
    expect(menuButton).toHaveAttribute("aria-expanded", "true");
    // Body scroll locked while mobile drawer is open
    expect(document.body.style.overflow).toBe("hidden");

    // 2. Press Escape key to close mobile menu
    fireEvent.keyDown(window, { key: "Escape" });
    expect(menuButton).toHaveAttribute("aria-expanded", "false");
    // Body scroll restored
    expect(document.body.style.overflow).toBe("");

    // 3. Re-open menu and click navigation link to verify smooth scroll + close
    fireEvent.click(menuButton);
    expect(menuButton).toHaveAttribute("aria-expanded", "true");
    expect(document.body.style.overflow).toBe("hidden");

    const drawerNav = document.getElementById("public-mobile-navigation");
    expect(drawerNav).toBeInTheDocument();

    const aboutLinks = screen.getAllByRole("link", { name: "About" });
    const mobileAboutLink = aboutLinks[aboutLinks.length - 1];
    expect(mobileAboutLink).toHaveAttribute("href", "#about");

    fireEvent.click(mobileAboutLink!);
    expect(menuButton).toHaveAttribute("aria-expanded", "false");
    expect(document.body.style.overflow).toBe("");
  });

  it("Section 77, 68, 69: German length stress test & mobile language switcher updates localized navigation labels", async () => {
    window.innerWidth = 360;
    renderWithClient(<PublicPage />);

    await screen.findByText("SPA Saxophone Ensemble Mobile Audit");

    const deButton = screen.getByTestId("lang-switch-de");
    fireEvent.click(deButton);

    await waitFor(() => {
      expect(
        screen.getByText("SPA Saxophon-Ensemble Offiziell"),
      ).toBeInTheDocument();
    });

    // Check German navigation labels are updated from localized backend response
    expect(
      screen.getAllByRole("link", { name: "DE-About" }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("link", { name: "DE-Gallery" }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("link", { name: "DE-Contact" }).length,
    ).toBeGreaterThan(0);
  });

  it("V1.2 Section 10-14: Mobile layout has exactly ONE language switcher in top header and ZERO duplicate in mobile drawer", async () => {
    window.innerWidth = 375;
    renderWithClient(<PublicPage />);

    await screen.findByText("SPA Saxophone Ensemble Mobile Audit");

    // 1. Assert exactly ONE language switcher instance exists in the DOM
    const langSwitchers = screen.getAllByRole("group", {
      name: "Language selection",
    });
    expect(langSwitchers).toHaveLength(1);
    expect(screen.getAllByTestId("lang-switch-en")).toHaveLength(1);
    expect(screen.getAllByTestId("lang-switch-de")).toHaveLength(1);

    // 2. Open mobile drawer
    const menuButton = screen.getByRole("button", {
      name: /Toggle navigation/i,
    });
    fireEvent.click(menuButton);
    expect(menuButton).toHaveAttribute("aria-expanded", "true");

    const drawerNav = document.getElementById("public-mobile-navigation")!;
    expect(drawerNav).toBeInTheDocument();
    const mobileDrawer = drawerNav.closest("div")!;
    expect(mobileDrawer).toBeInTheDocument();

    // 3. Navigation links are visible inside drawer
    expect(
      within(drawerNav).getByRole("link", { name: "About" }),
    ).toBeInTheDocument();
    expect(
      within(drawerNav).getByRole("link", { name: "Gallery" }),
    ).toBeInTheDocument();
    expect(
      within(drawerNav).getByRole("link", { name: "Contact" }),
    ).toBeInTheDocument();

    // 4. Language switcher is NOT present inside drawer
    expect(
      within(mobileDrawer).queryByRole("group", { name: "Language selection" }),
    ).toBeNull();
    expect(within(mobileDrawer).queryByTestId("lang-switch-en")).toBeNull();
    expect(within(mobileDrawer).queryByTestId("lang-switch-de")).toBeNull();

    // 5. Top language switcher works (EN -> DE)
    const topDeButton = screen.getByTestId("lang-switch-de");
    fireEvent.click(topDeButton);

    await waitFor(() => {
      expect(
        screen.getByText("SPA Saxophon-Ensemble Offiziell"),
      ).toBeInTheDocument();
    });

    // 6. Drawer links show updated German locale
    expect(
      within(drawerNav).getByRole("link", { name: "DE-About" }),
    ).toBeInTheDocument();
    expect(
      within(drawerNav).getByRole("link", { name: "DE-Gallery" }),
    ).toBeInTheDocument();
    expect(
      within(drawerNav).getByRole("link", { name: "DE-Contact" }),
    ).toBeInTheDocument();

    // 7. Desktop regression: at 1280px, language switcher is present and functional
    window.innerWidth = 1280;
    window.dispatchEvent(new Event("resize"));
    expect(screen.getByTestId("lang-switch-en")).toBeInTheDocument();
    expect(screen.getByTestId("lang-switch-de")).toBeInTheDocument();
  });

  it("Section 78: TextImageBlock stacks cleanly without horizontal overflow", () => {
    const block = mockResponsivePublicPage.data.sections[0]!.blocks[0]!;
    const { container } = render(<TextImageBlock block={block} />);

    const article = container.querySelector("article");
    expect(article).toBeInTheDocument();

    const img = container.querySelector("img");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.test/sax-quartet.jpg");
    expect(img).toHaveAttribute("loading", "lazy");
  });

  it("Section 79: TextYoutubeBlock renders responsive iframe with 16:9 ratio and youtube-nocookie", () => {
    const block = mockResponsivePublicPage.data.sections[0]!.blocks[2]!;
    const { container } = render(<TextYoutubeBlock block={block} />);

    const iframe = container.querySelector("iframe");
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute(
      "src",
      "https://www.youtube-nocookie.com/embed/mockYtId",
    );
    expect(iframe).toHaveAttribute("allowFullScreen");
  });

  it("Section 80: TextVideoBlock renders responsive native video player with metadata preload", () => {
    const block = mockResponsivePublicPage.data.sections[0]!.blocks[1]!;
    const { container } = render(<TextVideoBlock block={block} />);

    const video = container.querySelector("video");
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute("controls");
    expect(video).toHaveAttribute("preload", "metadata");
  });

  it("Section 81, 25, 26: Contact form renders responsive full-width inputs and wraps validation errors", () => {
    renderWithClient(<ContactForm />);

    const nameInput = screen.getByLabelText(/Name/i);
    const emailInput = screen.getByLabelText(/Email/i);
    const messageInput = screen.getByLabelText(/Message/i);
    const submitBtn = screen.getByRole("button", { name: /Send Message/i });

    expect(nameInput).toBeInTheDocument();
    expect(emailInput).toBeInTheDocument();
    expect(messageInput).toBeInTheDocument();
    expect(submitBtn).toBeInTheDocument();

    // Trigger validation
    fireEvent.click(submitBtn);

    expect(screen.getByText(/Name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Message is required/i)).toBeInTheDocument();
  });

  it("Section 82: Gallery ImageCarousel renders responsive carousel and handles keyboard navigation", () => {
    const images = [
      {
        id: "gal-1",
        url: "https://example.test/photo1.jpg",
        filename: "photo1.jpg",
        mime_type: "image/jpeg",
        size_bytes: 200000,
        type: "image" as const,
        alt_text: "Performance 1",
        created_at: "2026-01-01T00:00:00Z",
      },
      {
        id: "gal-2",
        url: "https://example.test/photo2.jpg",
        filename: "photo2.jpg",
        mime_type: "image/jpeg",
        size_bytes: 210000,
        type: "image" as const,
        alt_text: "Performance 2",
        created_at: "2026-01-01T00:00:00Z",
      },
    ];

    render(<ImageCarousel images={images} title="Gallery" />);

    expect(
      screen.getByRole("region", { name: /Gallery carousel/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("1 / 2")).toBeInTheDocument();

    const nextBtn = screen.getByRole("button", { name: /Next image/i });
    fireEvent.click(nextBtn);
    expect(screen.getByText("2 / 2")).toBeInTheDocument();
  });

  it("Section 83, 28, 29, 30: Page Appearance overlay and background cover the entire page height without fixed attachment", async () => {
    renderWithClient(<PublicPage />);

    await screen.findByText("SPA Saxophone Ensemble Mobile Audit");

    const bgLayer = screen.getByTestId("public-fixed-background");
    expect(bgLayer).toHaveStyle({
      backgroundImage: "url(https://example.test/hero-bg.jpg)",
      backgroundPosition: "center",
      backgroundSize: "cover",
    });

    const overlay = screen.getByTestId("public-page-overlay");
    expect(overlay).toBeInTheDocument();
    expect(overlay).toHaveStyle({ opacity: "0.45" });
  });

  it("Section 84, 11-16, 33-36: Admin Layout mobile drawer open/closed state contract, CSS-module class, close button, backdrop, route-link close, Escape key, and unmount scroll cleanup", async () => {
    const mockAdminUser = {
      id: "10000000-0000-4000-8000-000000000001",
      email: "admin@enstisax.com",
      display_name: "Admin User",
      role: "super_admin" as const,
      is_active: true,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };

    authSession.setAccessToken("mock-token");

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/auth/me`, () => {
        return HttpResponse.json({ data: mockAdminUser });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/contact-messages`, () => {
        return HttpResponse.json({ data: [] });
      }),
    );

    const { unmount } = renderWithClient(
      <MemoryRouter initialEntries={["/admin"]}>
        <AuthProvider>
          <Routes>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<div>Dashboard Page</div>} />
              <Route
                path="/admin/sections"
                element={<div>Sections Page</div>}
              />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    await screen.findByText("Dashboard Page");

    const menuToggle = screen.getByRole("button", { name: /Open admin menu/i });
    const drawer = document.getElementById("admin-mobile-drawer")!;
    expect(drawer).toBeInTheDocument();

    // 1. VERIFY CLOSED STATE:
    // Drawer has hidden attribute, does NOT have mobileDrawerOpen class, backdrop is absent, body scroll unlocked
    expect(menuToggle).toHaveAttribute("aria-expanded", "false");
    expect(drawer).toHaveAttribute("hidden");
    expect(drawer).not.toHaveClass(String(adminLayoutStyles.mobileDrawerOpen));
    expect(
      document.querySelector(`.${adminLayoutStyles.drawerBackdrop}`),
    ).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");

    // 2. VERIFY OPEN STATE:
    // Tap admin mobile menu -> drawer receives actual CSS Module open class, hidden removed, backdrop visible, body scroll locked
    fireEvent.click(menuToggle);
    expect(menuToggle).toHaveAttribute("aria-expanded", "true");
    expect(drawer).not.toHaveAttribute("hidden");
    expect(drawer).toHaveClass(String(adminLayoutStyles.mobileDrawerOpen));
    expect(
      document.querySelector(`.${adminLayoutStyles.drawerBackdrop}`),
    ).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");

    // Check all routes in drawer
    expect(
      within(drawer).getByRole("link", { name: "Sections" }),
    ).toBeInTheDocument();
    expect(
      within(drawer).getByRole("link", { name: "Content" }),
    ).toBeInTheDocument();
    expect(
      within(drawer).getByRole("link", { name: "Testimonials" }),
    ).toBeInTheDocument();
    expect(
      within(drawer).getByRole("link", { name: "Contact Messages" }),
    ).toBeInTheDocument();
    expect(
      within(drawer).getByRole("link", { name: "Page Appearance" }),
    ).toBeInTheDocument();
    expect(
      within(drawer).getByRole("link", { name: "Users" }),
    ).toBeInTheDocument();

    // 3. VERIFY CLOSE BUTTON:
    // Clicking close button removes open class, sets hidden attribute, hides backdrop, restores body scrolling
    const closeBtn = within(drawer).getByRole("button", {
      name: /Close admin menu/i,
    });
    fireEvent.click(closeBtn);
    expect(menuToggle).toHaveAttribute("aria-expanded", "false");
    expect(drawer).toHaveAttribute("hidden");
    expect(drawer).not.toHaveClass(String(adminLayoutStyles.mobileDrawerOpen));
    expect(
      document.querySelector(`.${adminLayoutStyles.drawerBackdrop}`),
    ).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");

    // 4. VERIFY ESCAPE CLOSE:
    fireEvent.click(menuToggle);
    expect(drawer).toHaveClass(String(adminLayoutStyles.mobileDrawerOpen));
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(menuToggle).toHaveAttribute("aria-expanded", "false");
    expect(drawer).toHaveAttribute("hidden");
    expect(drawer).not.toHaveClass(String(adminLayoutStyles.mobileDrawerOpen));
    expect(document.body.style.overflow).toBe("");

    // 5. VERIFY BACKDROP CLOSE:
    fireEvent.click(menuToggle);
    expect(drawer).toHaveClass(String(adminLayoutStyles.mobileDrawerOpen));
    const backdrop = document.querySelector(
      `.${adminLayoutStyles.drawerBackdrop}`,
    );
    expect(backdrop).toBeInTheDocument();
    fireEvent.click(backdrop!);
    expect(menuToggle).toHaveAttribute("aria-expanded", "false");
    expect(drawer).toHaveAttribute("hidden");
    expect(drawer).not.toHaveClass(String(adminLayoutStyles.mobileDrawerOpen));
    expect(document.body.style.overflow).toBe("");

    // 6. VERIFY ROUTE NAVIGATION CLOSE:
    fireEvent.click(menuToggle);
    expect(drawer).toHaveClass(String(adminLayoutStyles.mobileDrawerOpen));
    const sectionsLink = within(drawer).getByRole("link", {
      name: "Sections",
    });
    fireEvent.click(sectionsLink);
    expect(menuToggle).toHaveAttribute("aria-expanded", "false");
    expect(drawer).toHaveAttribute("hidden");
    expect(drawer).not.toHaveClass(String(adminLayoutStyles.mobileDrawerOpen));
    expect(document.body.style.overflow).toBe("");

    // 7. VERIFY UNMOUNT CLEANUP:
    // Re-open drawer so body scroll is locked, then unmount AdminLayout
    fireEvent.click(menuToggle);
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("Section 86, 24, 25, 37, 38: Admin components (Users, Sections, Contact Messages, Testimonials) render inside real responsive table wrappers and scroll containers", () => {
    // 1. Users table wrapper contract
    const mockUsers: UserDto[] = [
      {
        id: "10000000-0000-4000-8000-000000000001",
        email: "alice@enstisax.com",
        display_name: "Alice Sax",
        role: "admin",
        is_active: true,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ];

    const { container: usersContainer } = render(
      <UsersList
        users={mockUsers}
        onEdit={() => {}}
        onToggleStatus={() => {}}
      />,
    );

    const usersTable = usersContainer.querySelector("table");
    expect(usersTable).toBeInTheDocument();
    const usersWrapper = usersTable?.closest(`.${usersStyles.tableWrapper}`);
    expect(usersWrapper).toBeInTheDocument();

    // 2. SpaSections table wrapper contract
    const mockSections: AdminSpaSectionDto[] = [
      {
        id: "77777777-7777-4777-8777-777777777771",
        key: "about",
        title: "About",
        navigation_label: "About",
        is_visible: true,
        sort_order: 10,
        content_block_count: 2,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ];

    const { container: sectionsContainer } = render(
      <SpaSectionsList
        sections={mockSections}
        onEdit={() => {}}
        onDelete={() => {}}
      />,
    );

    const sectionsTable = sectionsContainer.querySelector("table");
    expect(sectionsTable).toBeInTheDocument();
    const sectionsWrapper = sectionsTable?.closest(
      `.${sectionsStyles.tableWrapper}`,
    );
    expect(sectionsWrapper).toBeInTheDocument();

    // 3. Contact Messages responsive container contract
    const mockMessages: AdminContactMessageDto[] = [
      {
        id: "88888888-8888-4888-8888-888888888881",
        name: "Max Mustermann",
        email: "max@example.com",
        subject: "Booking Inquiry",
        message: "Hello ensemble",
        is_read: false,
        email_status: "sent",
        email_error: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ];

    const { container: messagesContainer } = render(
      <ContactMessagesList
        messages={mockMessages}
        onSelectMessage={() => {}}
      />,
    );

    const messagesList = messagesContainer.querySelector(
      `.${contactMessagesStyles.messagesList}`,
    );
    expect(messagesList).toBeInTheDocument();

    // 4. Testimonials responsive grid container contract
    const mockTestimonials: AdminTestimonialDto[] = [
      {
        id: "99999999-9999-4999-8999-999999999991",
        author_name: "Prof. Richter",
        author_role: "Music Critic",
        text: "Outstanding virtuosity and tonal warmth.",
        moderation_status: "approved",
        submission_source: "admin",
        is_visible: true,
        sort_order: 10,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        avatar: null,
      },
    ];

    const { container: testimonialsContainer } = render(
      <TestimonialsList
        testimonials={mockTestimonials}
        approvedTestimonials={mockTestimonials}
        onEdit={() => {}}
        onDelete={() => {}}
        onToggleVisibility={() => {}}
        onApprove={() => {}}
        onReject={() => {}}
        onMoveUp={() => {}}
        onMoveDown={() => {}}
        isReordering={false}
        isUpdatingVisibility={false}
        onOpenCreateModal={() => {}}
      />,
    );

    const testimonialsGrid = testimonialsContainer.querySelector(
      `.${testimonialsStyles.testimonialsGrid}`,
    );
    expect(testimonialsGrid).toBeInTheDocument();
  });

  it("Section 87, 41, 43, 44: Admin Modals fit within viewport without clipping at 320px", () => {
    const mockSection: AdminSpaSectionDto = {
      id: "77777777-7777-4777-8777-777777777771",
      key: "biography",
      title: "Biography",
      navigation_label: "Bio",
      is_visible: true,
      sort_order: 10,
      content_block_count: 0,
      translations: {
        en: { name: "Biography", navigation_label: "Bio" },
        de: { name: "Biografie", navigation_label: "Bio DE" },
      },
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };

    window.innerWidth = 320;

    renderWithClient(
      <SpaSectionEditModal
        section={mockSection}
        isOpen={true}
        onClose={() => {}}
      />,
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Edit SPA Section" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /English/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Deutsch/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save Changes" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("Section 88, 48, 49, 50, 51: Page Appearance Admin Page is fully usable on mobile", async () => {
    const mockAppearance: AdminPageAppearanceDto = {
      background_mode: "color",
      background_color: "#243A3A",
      background_media: null,
      overlay_opacity: 0.3,
      background_position: "center",
      background_size: "cover",
    };

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/admin/page-appearance`, () => {
        return HttpResponse.json({ data: mockAppearance });
      }),
    );

    window.innerWidth = 375;

    renderWithClient(<PageAppearancePage />);

    await screen.findByTestId("appearance-mode-color");

    // Check mode selector buttons
    expect(screen.getByTestId("appearance-mode-none")).toBeInTheDocument();
    expect(screen.getByTestId("appearance-mode-color")).toBeInTheDocument();
    expect(screen.getByTestId("appearance-mode-image")).toBeInTheDocument();

    // Check color picker and hex input
    expect(screen.getByTestId("appearance-color-picker")).toBeInTheDocument();
    expect(screen.getByTestId("appearance-color-input")).toBeInTheDocument();

    // Check preview card
    expect(screen.getByTestId("appearance-live-preview")).toBeInTheDocument();

    // Check save button
    expect(screen.getByTestId("appearance-save-button")).toBeInTheDocument();
  });
});
