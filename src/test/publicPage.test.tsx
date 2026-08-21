import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { server } from "./msw/server";
import { PublicPage } from "../features/public-page/PublicPage";
import { env } from "../lib/env";

const mockDynamicPublicPageResponse = {
  data: {
    page: {
      id: "a1b2c3d4-e5f6-4890-abcd-ef1234567890",
      slug: "home",
      title: "SPA Saxophone Ensemble Official",
      seo_title: "SPA Saxophone Ensemble",
      seo_description: "Dynamic public SPA",
      seo_keywords: ["saxophone"],
    },
    sections: [
      {
        id: "e0b9687e-e2e4-4d8b-9a84-9343ee6df322",
        key: "awards-list",
        title: "International Awards",
        navigation_label: "Awards",
        sort_order: 10,
        blocks: [
          {
            id: "7649fb99-702b-47e1-b4cb-d48e89f81d19",
            block_type: "text",
            title: "First Prize 2025",
            text: "Winner of the Grand Saxophone Competition.",
            media: null,
            sort_order: 10,
          },
        ],
      },
      {
        id: "e0b9687e-e2e4-4d8b-9a84-9343ee6df323",
        key: "partners-section",
        title: "Our Esteemed Partners",
        navigation_label: "Partners",
        sort_order: 20,
        blocks: [], // Intentionally empty visible section
      },
      {
        id: "e0b9687e-e2e4-4d8b-9a84-9343ee6df324",
        key: "festival-2027",
        title: "World Tour & Festival 2027",
        navigation_label: "Festival 2027",
        sort_order: 30,
        blocks: [
          {
            id: "7649fb99-702b-47e1-b4cb-d48e89f81d20",
            block_type: "text",
            title: "Tour Dates",
            text: "Paris, Vienna, Tokyo, New York.",
            media: null,
            sort_order: 10,
          },
        ],
      },
    ],
  },
};

const mockTwelveSectionsPublicPageResponse = {
  data: {
    page: {
      id: "a1b2c3d4-e5f6-4890-abcd-ef1234567890",
      slug: "home",
      title: "SPA Saxophone Ensemble 12-Section Scale Test",
      seo_title: "SPA Saxophone Ensemble",
      seo_description: "Scaling test",
      seo_keywords: ["saxophone"],
    },
    sections: [
      {
        id: "e0b9687e-e2e4-4d8b-9a84-9343ee6df301",
        key: "awards-list",
        title: "International Awards & Recognition",
        navigation_label: "Awards",
        sort_order: 10,
        blocks: [
          {
            id: "7649fb99-702b-47e1-b4cb-d48e89f81d01",
            block_type: "text",
            title: "First Prize 2025",
            text: "Winner of the Grand Saxophone Competition.",
            media: null,
            sort_order: 10,
          },
        ],
      },
      {
        id: "e0b9687e-e2e4-4d8b-9a84-9343ee6df302",
        key: "partners-section",
        title: "Our Esteemed Global Partners",
        navigation_label: "Partners",
        sort_order: 20,
        blocks: [], // Intentionally empty visible section
      },
      {
        id: "e0b9687e-e2e4-4d8b-9a84-9343ee6df303",
        key: "festival-performances",
        title: "International Festivals and Performances World Tour",
        navigation_label: "International Festivals and Performances", // Long label
        sort_order: 30,
        blocks: [
          {
            id: "7649fb99-702b-47e1-b4cb-d48e89f81d02",
            block_type: "text",
            title: "Tour Dates",
            text: "Paris, Vienna, Tokyo, New York.",
            media: null,
            sort_order: 10,
          },
        ],
      },
      {
        id: "e0b9687e-e2e4-4d8b-9a84-9343ee6df304",
        key: "creative-collaborations",
        title: "Collaborations and Creative Partnerships Across Continents",
        navigation_label: "Collaborations and Creative Partnerships", // Long label
        sort_order: 40,
        blocks: [
          {
            id: "7649fb99-702b-47e1-b4cb-d48e89f81d03",
            block_type: "text",
            title: "Symphonic Features",
            text: "Performing alongside world renown orchestras.",
            media: null,
            sort_order: 10,
          },
        ],
      },
      {
        id: "e0b9687e-e2e4-4d8b-9a84-9343ee6df305",
        key: "press-and-media",
        title: "Press & Media Coverage",
        navigation_label: "Press",
        sort_order: 50,
        blocks: [
          {
            id: "7649fb99-702b-47e1-b4cb-d48e89f81d04",
            block_type: "text",
            title: "Reviews",
            text: "Critically acclaimed quartet performance.",
            media: null,
            sort_order: 10,
          },
        ],
      },
      {
        id: "e0b9687e-e2e4-4d8b-9a84-9343ee6df306",
        key: "ensemble-team",
        title: "Ensemble Musicians & Team",
        navigation_label: "Team",
        sort_order: 60,
        blocks: [],
      },
      {
        id: "e0b9687e-e2e4-4d8b-9a84-9343ee6df307",
        key: "concert-booking",
        title: "Concert Booking & Inquiries",
        navigation_label: "Booking",
        sort_order: 70,
        blocks: [],
      },
      {
        id: "e0b9687e-e2e4-4d8b-9a84-9343ee6df308",
        key: "latest-news",
        title: "Latest News & Updates",
        navigation_label: "News",
        sort_order: 80,
        blocks: [],
      },
      {
        id: "e0b9687e-e2e4-4d8b-9a84-9343ee6df309",
        key: "educational-projects",
        title: "Educational Workshops & Projects",
        navigation_label: "Projects",
        sort_order: 90,
        blocks: [],
      },
      {
        id: "e0b9687e-e2e4-4d8b-9a84-9343ee6df310",
        key: "artist-residencies",
        title: "Artist Residencies 2026-2027",
        navigation_label: "Residencies",
        sort_order: 100,
        blocks: [],
      },
      {
        id: "e0b9687e-e2e4-4d8b-9a84-9343ee6df311",
        key: "festival-2028",
        title: "Festival Preview 2028",
        navigation_label: "Festival 2028",
        sort_order: 110,
        blocks: [],
      },
      {
        id: "e0b9687e-e2e4-4d8b-9a84-9343ee6df312",
        key: "contact-information",
        title: "Contact Information",
        navigation_label: "Contact",
        sort_order: 120,
        blocks: [],
      },
    ],
  },
};

function renderWithClient(ui: React.ReactElement) {
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
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("PublicPage Feature F2", () => {
  const originalTitle = document.title;

  beforeEach(() => {
    document.title = "Default Title";
  });

  afterEach(() => {
    document.title = originalTitle;
    vi.restoreAllMocks();
  });

  it("renders loading state initially while fetching public page", () => {
    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/public/page`, async () => {
        return new Promise(() => {}); // Never resolves to simulate pending state
      }),
    );

    renderWithClient(<PublicPage />);

    expect(screen.getByText(/Loading.../i)).toBeInTheDocument();
  });

  it("renders error state with request ID and supports retry", async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/public/page`, () => {
        return HttpResponse.json(
          {
            error: {
              code: "INTERNAL_SERVER_ERROR",
              message: "Database connection failed",
              request_id: "req-err-12345",
            },
          },
          { status: 500 },
        );
      }),
    );

    renderWithClient(<PublicPage />);

    // Initial load fails and displays error UI
    const errorHeading = await screen.findByText(
      "Error (INTERNAL_SERVER_ERROR)",
    );
    expect(errorHeading).toBeInTheDocument();
    expect(screen.getByText(/Database connection failed/i)).toBeInTheDocument();
    expect(screen.getByText(/req-err-12345/i)).toBeInTheDocument();

    // Override handler to return 200 success for retry
    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/public/page`, () => {
        return HttpResponse.json(mockDynamicPublicPageResponse);
      }),
    );

    // Click retry
    const retryButton = screen.getByRole("button", { name: /retry/i });
    fireEvent.click(retryButton);

    // Second load succeeds and displays content
    const pageTitle = await screen.findByText(
      "SPA Saxophone Ensemble Official",
    );
    expect(pageTitle).toBeInTheDocument();
    expect(screen.getByText("International Awards")).toBeInTheDocument();
  });

  it("renders dynamic navigation and anchors matching backend section keys", async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/public/page`, () => {
        return HttpResponse.json(mockDynamicPublicPageResponse);
      }),
    );

    renderWithClient(<PublicPage />);

    await screen.findByText("SPA Saxophone Ensemble Official");

    // Verify navigation labels come from backend navigation_label
    const navLinkAwards = screen.getAllByRole("link", { name: "Awards" })[0];
    const navLinkPartners = screen.getAllByRole("link", {
      name: "Partners",
    })[0];
    const navLinkFestival = screen.getAllByRole("link", {
      name: "Festival 2027",
    })[0];

    expect(navLinkAwards).toHaveAttribute("href", "#awards-list");
    expect(navLinkPartners).toHaveAttribute("href", "#partners-section");
    expect(navLinkFestival).toHaveAttribute("href", "#festival-2027");

    // Verify rendered section element IDs match backend section keys
    const sectionAwards = document.getElementById("awards-list");
    const sectionPartners = document.getElementById("partners-section");
    const sectionFestival = document.getElementById("festival-2027");

    expect(sectionAwards).not.toBeNull();
    expect(sectionPartners).not.toBeNull();
    expect(sectionFestival).not.toBeNull();

    expect(sectionAwards?.tagName.toLowerCase()).toBe("section");
  });

  it("preserves section array ordering from backend and renders visible empty sections", async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/public/page`, () => {
        return HttpResponse.json(mockDynamicPublicPageResponse);
      }),
    );

    renderWithClient(<PublicPage />);

    await screen.findByText("SPA Saxophone Ensemble Official");

    // Verify DOM order of sections matches array order [awards-list, partners-section, festival-2027]
    const sections = Array.from(document.querySelectorAll("main > section"));
    expect(sections.map((s) => s.id)).toEqual([
      "awards-list",
      "partners-section",
      "festival-2027",
    ]);

    // Verify empty section (partners-section with blocks: []) is still rendered with heading, anchor, and navigation link
    const emptySectionHeading = screen.getByRole("heading", {
      name: "Our Esteemed Partners",
    });
    expect(emptySectionHeading).toBeInTheDocument();

    const emptySectionElement = document.getElementById("partners-section");
    expect(emptySectionElement).not.toBeNull();

    const navLinkPartners = screen.getAllByRole("link", {
      name: "Partners",
    })[0];
    expect(navLinkPartners).toHaveAttribute("href", "#partners-section");
  });

  it("renders 12 dynamic sections without filtering or reordering, supporting long labels and anchors", async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/public/page`, () => {
        return HttpResponse.json(mockTwelveSectionsPublicPageResponse);
      }),
    );

    renderWithClient(<PublicPage />);

    await screen.findByText("SPA Saxophone Ensemble 12-Section Scale Test");

    const expectedLabels = [
      "Awards",
      "Partners",
      "International Festivals and Performances",
      "Collaborations and Creative Partnerships",
      "Press",
      "Team",
      "Booking",
      "News",
      "Projects",
      "Residencies",
      "Festival 2028",
      "Contact",
    ];

    const expectedKeys = [
      "awards-list",
      "partners-section",
      "festival-performances",
      "creative-collaborations",
      "press-and-media",
      "ensemble-team",
      "concert-booking",
      "latest-news",
      "educational-projects",
      "artist-residencies",
      "festival-2028",
      "contact-information",
    ];

    // 1. Verify desktop navigation list contains all 12 items in exact order
    const desktopNav = document.getElementById("public-desktop-navigation");
    expect(desktopNav).not.toBeNull();

    const desktopLinks = Array.from(
      desktopNav!.querySelectorAll("a"),
    ) as HTMLAnchorElement[];
    expect(desktopLinks).toHaveLength(12);

    const actualDesktopLabels = desktopLinks.map((a) => a.textContent?.trim());
    expect(actualDesktopLabels).toEqual(expectedLabels);

    const actualDesktopHrefs = desktopLinks.map((a) => a.getAttribute("href"));
    expect(actualDesktopHrefs).toEqual(expectedKeys.map((k) => `#${k}`));

    // 2. Verify mobile navigation drawer list also contains all 12 items in exact order
    const mobileNav = document.getElementById("public-mobile-navigation");
    expect(mobileNav).not.toBeNull();

    const mobileLinks = Array.from(
      mobileNav!.querySelectorAll("a"),
    ) as HTMLAnchorElement[];
    expect(mobileLinks).toHaveLength(12);

    const actualMobileLabels = mobileLinks.map((a) => a.textContent?.trim());
    expect(actualMobileLabels).toEqual(expectedLabels);

    const actualMobileHrefs = mobileLinks.map((a) => a.getAttribute("href"));
    expect(actualMobileHrefs).toEqual(expectedKeys.map((k) => `#${k}`));

    // 3. Verify all 12 section elements exist in DOM in exact backend order
    const domSections = Array.from(document.querySelectorAll("main > section"));
    expect(domSections).toHaveLength(12);
    expect(domSections.map((s) => s.id)).toEqual(expectedKeys);

    // 3. Verify empty section (e.g. ensemble-team with blocks: []) is rendered
    const emptyTeamHeading = screen.getByRole("heading", {
      name: "Ensemble Musicians & Team",
    });
    expect(emptyTeamHeading).toBeInTheDocument();
  });

  it("renders graceful empty state when page sections array is completely empty", async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/public/page`, () => {
        return HttpResponse.json({
          data: {
            page: {
              id: "813876e5-42d8-4fbb-91ea-72223a3bc990",
              slug: "home",
              title: "Empty Saxophone Page",
            },
            sections: [],
          },
        });
      }),
    );

    renderWithClient(<PublicPage />);

    await screen.findByText("Empty Saxophone Page");
    expect(
      screen.getByText(/No content is available yet/i),
    ).toBeInTheDocument();
  });

  it("supports mobile navigation toggle, aria-expanded state, link click close, and Escape key close", async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/public/page`, () => {
        return HttpResponse.json(mockDynamicPublicPageResponse);
      }),
    );

    renderWithClient(<PublicPage />);

    await screen.findByText("SPA Saxophone Ensemble Official");

    const menuButton = screen.getByRole("button", {
      name: /Toggle navigation/i,
    });
    expect(menuButton).toHaveAttribute("aria-expanded", "false");

    // Open mobile menu
    fireEvent.click(menuButton);
    expect(menuButton).toHaveAttribute("aria-expanded", "true");

    // Press Escape to close menu
    fireEvent.keyDown(window, { key: "Escape" });
    expect(menuButton).toHaveAttribute("aria-expanded", "false");

    // Reopen menu and click navigation link
    fireEvent.click(menuButton);
    expect(menuButton).toHaveAttribute("aria-expanded", "true");

    const mobileNavLinks = screen.getAllByRole("link", { name: "Partners" });
    const mobileLink = mobileNavLinks[mobileNavLinks.length - 1];
    if (mobileLink) {
      fireEvent.click(mobileLink);
    }

    expect(menuButton).toHaveAttribute("aria-expanded", "false");
  });

  it("updates document.title with backend page title", async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/public/page`, () => {
        return HttpResponse.json(mockDynamicPublicPageResponse);
      }),
    );

    renderWithClient(<PublicPage />);

    await screen.findByText("SPA Saxophone Ensemble Official");
    expect(document.title).toBe("SPA Saxophone Ensemble Official");
  });

  it("tracks active section and cleans up IntersectionObserver", async () => {
    let observeCallback: IntersectionObserverCallback | null = null;
    const disconnectSpy = vi.fn();

    // Mock IntersectionObserver in test environment
    const MockObserver = vi.fn().mockImplementation((callback) => {
      observeCallback = callback;
      return {
        root: null,
        rootMargin: "0px",
        thresholds: [0],
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: disconnectSpy,
        takeRecords: () => [],
      };
    });

    vi.stubGlobal("IntersectionObserver", MockObserver);

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/public/page`, () => {
        return HttpResponse.json(mockDynamicPublicPageResponse);
      }),
    );

    const { unmount } = renderWithClient(<PublicPage />);

    await screen.findByText("SPA Saxophone Ensemble Official");

    // Simulate observer callback firing for festival-2027
    const festivalElement = document.getElementById("festival-2027");
    if (observeCallback && festivalElement) {
      const cb: IntersectionObserverCallback = observeCallback;
      const rect = festivalElement.getBoundingClientRect();
      const entry: IntersectionObserverEntry = {
        time: 0,
        rootBounds: null,
        boundingClientRect: rect,
        intersectionRect: rect,
        isIntersecting: true,
        intersectionRatio: 0.9,
        target: festivalElement,
      };
      const mockObserverInstance: IntersectionObserver = {
        root: null,
        rootMargin: "0px",
        thresholds: [0],
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: disconnectSpy,
        takeRecords: () => [],
      };
      act(() => {
        cb([entry], mockObserverInstance);
      });
    }

    // Verify aria-current="location" is attached to the active section link
    await waitFor(() => {
      const festivalLink = screen.getAllByRole("link", {
        name: "Festival 2027",
      })[0];
      expect(festivalLink).toHaveAttribute("aria-current", "location");
    });

    unmount();
    expect(disconnectSpy).toHaveBeenCalled();
  });

  it("handles missing IntersectionObserver gracefully without crashing", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/public/page`, () => {
        return HttpResponse.json(mockDynamicPublicPageResponse);
      }),
    );

    renderWithClient(<PublicPage />);

    const heading = await screen.findByText("SPA Saxophone Ensemble Official");
    expect(heading).toBeInTheDocument();
  });

  it("renders all four block types (text, text_image, text_video, text_youtube) from a single public page response", async () => {
    const mockAllFourBlockTypesResponse = {
      data: {
        page: {
          id: "a1b2c3d4-e5f6-4890-abcd-ef1234567890",
          slug: "home",
          title: "SPA Saxophone Ensemble Full Media Page",
          seo_title: "Full Media Page",
        },
        sections: [
          {
            id: "e0b9687e-e2e4-4d8b-9a84-9343ee6df401",
            key: "media-showcase",
            title: "Media Showcase",
            navigation_label: "Media",
            sort_order: 10,
            blocks: [
              {
                id: "7649fb99-702b-47e1-b4cb-d48e89f81e01",
                block_type: "text",
                title: "Ensemble Overview",
                text: "Welcome to our ensemble site.",
                media: null,
                sort_order: 10,
              },
              {
                id: "7649fb99-702b-47e1-b4cb-d48e89f81e02",
                block_type: "text_image",
                title: "Concert Poster",
                text: "Official tour poster.",
                media: {
                  type: "image",
                  id: "8649fb99-702b-47e1-b4cb-d48e89f81e02",
                  url: "https://cdn.example.test/poster.jpg",
                  alt_text: "Tour poster image",
                },
                sort_order: 20,
              },
              {
                id: "7649fb99-702b-47e1-b4cb-d48e89f81e03",
                block_type: "text_video",
                title: "Live Clip",
                text: "Excerpt from Paris performance.",
                media: {
                  type: "video",
                  id: "8649fb99-702b-47e1-b4cb-d48e89f81e03",
                  url: "https://cdn.example.test/paris.mp4",
                  mime_type: "video/mp4",
                },
                sort_order: 30,
              },
              {
                id: "7649fb99-702b-47e1-b4cb-d48e89f81e04",
                block_type: "text_youtube",
                title: "Full Performance",
                text: "Watch the full performance video.",
                media: {
                  type: "youtube",
                  id: "8649fb99-702b-47e1-b4cb-d48e89f81e04",
                  youtube_video_id: "abc123xyz",
                  embed_url: "https://www.youtube.com/embed/abc123xyz",
                  thumbnail_url:
                    "https://img.youtube.com/vi/abc123xyz/default.jpg",
                },
                sort_order: 40,
              },
            ],
          },
        ],
      },
    };

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/public/page`, () => {
        return HttpResponse.json(mockAllFourBlockTypesResponse);
      }),
    );

    renderWithClient(<PublicPage />);

    await screen.findByText("SPA Saxophone Ensemble Full Media Page");

    expect(screen.getByText("Ensemble Overview")).toBeInTheDocument();
    expect(screen.getByText("Concert Poster")).toBeInTheDocument();
    expect(screen.getByText("Live Clip")).toBeInTheDocument();
    expect(screen.getByText("Full Performance")).toBeInTheDocument();

    const img = screen.getByRole("img", { name: "Tour poster image" });
    expect(img).toHaveAttribute("src", "https://cdn.example.test/poster.jpg");

    const video = document.querySelector("video");
    expect(video).not.toBeNull();

    const iframe = document.querySelector("iframe");
    expect(iframe).toHaveAttribute(
      "src",
      "https://www.youtube.com/embed/abc123xyz",
    );
  });
});
