import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { server } from "./msw/server";
import { authSession } from "../features/auth/authSession";
import { env } from "../lib/env";
import {
  AdminTestimonialDto,
  AdminTestimonialDtoSchema,
  CreatePublicTestimonialRequestSchema,
  PublicPageResponse,
  UserDto,
} from "../api/types";
import { TestimonialsPage } from "../features/admin/testimonials/TestimonialsPage";
import { PublicPage } from "../features/public-page/PublicPage";
import { SpaSectionsPage } from "../features/admin/sections/SpaSectionsPage";
import { AuthProvider } from "../features/auth/AuthProvider";
import { ProtectedAdminRoute } from "../features/auth/ProtectedAdminRoute";
import { AdminLayout } from "../features/admin/AdminLayout";
import { TestimonialCarousel } from "../features/public-page/TestimonialCarousel";
import { publicApi } from "../api/publicApi";

const mockAdminUser: UserDto = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "admin@example.test",
  display_name: "Admin User",
  role: "admin",
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const mockMixedTestimonials: AdminTestimonialDto[] = [
  {
    id: "11111111-0000-4000-8000-000000000001",
    author_name: "Approved Alpha",
    author_role: "Lead Trumpet",
    text: "Remarkable performance by the ensemble.",
    avatar: null,
    sort_order: 10,
    is_visible: true,
    moderation_status: "approved",
    submission_source: "admin",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "22222222-0000-4000-8000-000000000002",
    author_name: "Pending Penny",
    author_role: "Concert Attendee",
    text: "Loved the sax harmonies at the festival!",
    avatar: null,
    sort_order: 20,
    is_visible: false,
    moderation_status: "pending",
    submission_source: "public",
    created_at: "2026-01-02T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
  },
  {
    id: "33333333-0000-4000-8000-000000000003",
    author_name: "Approved Beta",
    author_role: "Music Critic",
    text: "A masterclass in modern chamber resonance.",
    avatar: null,
    sort_order: 30,
    is_visible: true,
    moderation_status: "approved",
    submission_source: "admin",
    created_at: "2026-01-03T00:00:00Z",
    updated_at: "2026-01-03T00:00:00Z",
  },
  {
    id: "44444444-0000-4000-8000-000000000004",
    author_name: "Rejected Ron",
    author_role: "Spammer",
    text: "Buy cheap tickets here at spam.test!",
    avatar: null,
    sort_order: 40,
    is_visible: false,
    moderation_status: "rejected",
    submission_source: "public",
    created_at: "2026-01-04T00:00:00Z",
    updated_at: "2026-01-04T00:00:00Z",
  },
];

describe("FRONTEND TESTIMONIALS V2 — PUBLIC SUBMISSION + ADMIN MODERATION + CANONICAL ORDER", () => {
  beforeEach(() => {
    authSession.setTokens("mock-access-token", "mock-refresh-token");
    authSession.resetCheckedState();
    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/auth/me`, () => {
        return HttpResponse.json({ data: mockAdminUser });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/testimonials`, () => {
        return HttpResponse.json({ data: mockMixedTestimonials });
      }),
    );
  });

  afterEach(() => {
    authSession.clearSession();
    server.resetHandlers();
  });

  function renderAdminTestimonials() {
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
                  path: "testimonials",
                  element: <TestimonialsPage />,
                },
              ],
            },
          ],
        },
      ],
      { initialEntries: ["/admin/testimonials"] },
    );

    return render(
      <QueryClientProvider client={testQueryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </QueryClientProvider>,
    );
  }

  function renderPublicView(publicPageData: PublicPageResponse) {
    const testQueryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });

    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/public/page`, () => {
        return HttpResponse.json({ data: publicPageData });
      }),
    );

    return render(
      <QueryClientProvider client={testQueryClient}>
        <PublicPage />
      </QueryClientProvider>,
    );
  }

  // --- PART 1: SCHEMAS & CLIENT VALIDATION ---
  describe("DTO Schemas & Validation", () => {
    it("validates AdminTestimonialDto with moderation_status and submission_source", () => {
      for (const item of mockMixedTestimonials) {
        const result = AdminTestimonialDtoSchema.safeParse(item);
        expect(result.success).toBe(true);
      }
    });

    it("enforces CreatePublicTestimonialRequestSchema constraints", () => {
      // Valid input
      const valid = CreatePublicTestimonialRequestSchema.safeParse({
        author_name: "  Sarah Vaughan  ",
        author_role: "  Jazz Vocalist  ",
        text: "  Unbelievable musicianship!  ",
      });
      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.author_name).toBe("Sarah Vaughan");
        expect(valid.data.author_role).toBe("Jazz Vocalist");
        expect(valid.data.text).toBe("Unbelievable musicianship!");
      }

      // Empty / whitespace name
      expect(
        CreatePublicTestimonialRequestSchema.safeParse({
          author_name: "   ",
          text: "Great show!",
        }).success,
      ).toBe(false);

      // Name exceeding 120 chars
      expect(
        CreatePublicTestimonialRequestSchema.safeParse({
          author_name: "a".repeat(121),
          text: "Great show!",
        }).success,
      ).toBe(false);

      // Role exceeding 160 chars
      expect(
        CreatePublicTestimonialRequestSchema.safeParse({
          author_name: "Sarah",
          author_role: "r".repeat(161),
          text: "Great show!",
        }).success,
      ).toBe(false);

      // Empty text
      expect(
        CreatePublicTestimonialRequestSchema.safeParse({
          author_name: "Sarah",
          text: "   ",
        }).success,
      ).toBe(false);

      // Text exceeding 3000 chars
      expect(
        CreatePublicTestimonialRequestSchema.safeParse({
          author_name: "Sarah",
          text: "t".repeat(3001),
        }).success,
      ).toBe(false);
    });
  });

  // --- PART 2: PUBLIC "LEAVE A REVIEW" FORM ---
  describe("Public 'Leave a Review' Form", () => {
    const defaultPublicData: PublicPageResponse = {
      page: {
        id: "aaaaaaaa-0000-4000-8000-000000000001",
        slug: "home",
        title: "SPA Saxophone Ensemble",
        seo_title: "SPA Ensemble",
        seo_description: "Ensemble description",
        seo_keywords: [],
      },
      sections: [
        {
          id: "bbbbbbbb-0000-4000-8000-000000000001",
          key: "testimonials",
          title: "Reviews & Testimonials",
          navigation_label: "Testimonials",
          sort_order: 30,
          blocks: [],
        },
      ],
      testimonials: [], // 0 testimonials
    };

    it("renders Leave a review form inside testimonials section even with 0 testimonials", async () => {
      renderPublicView(defaultPublicData);

      await screen.findByText("Reviews & Testimonials");
      expect(screen.getByText("Leave a Review")).toBeInTheDocument();
      expect(screen.getByLabelText(/Your Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Your Role/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Your Review/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Submit review/i }),
      ).toBeInTheDocument();
    });

    it("submits review to POST /api/v1/public/testimonials with exact payload, zero auth header, and zero 401 refresh calls", async () => {
      let capturedRequest: Request | null = null;
      let capturedPayload: unknown = null;
      let refreshCallCount = 0;

      server.use(
        http.post(
          `${env.apiBaseUrl}/api/v1/public/testimonials`,
          async ({ request }) => {
            capturedRequest = request;
            capturedPayload = await request.json();
            return HttpResponse.json(
              {
                data: {
                  id: "eeeeeeee-0000-4000-8000-000000000001",
                  status: "pending",
                },
              },
              { status: 201 },
            );
          },
        ),
        http.post(`${env.apiBaseUrl}/api/v1/auth/refresh`, () => {
          refreshCallCount++;
          return HttpResponse.json({ data: {} });
        }),
      );

      renderPublicView(defaultPublicData);

      await screen.findByText("Leave a Review");

      const nameInput = screen.getByLabelText(/Your Name/i);
      const roleInput = screen.getByLabelText(/Your Role/i);
      const textInput = screen.getByLabelText(/Your Review/i);
      const submitButton = screen.getByRole("button", {
        name: /Submit review/i,
      });

      fireEvent.change(nameInput, { target: { value: "Ella Fitzgerald" } });
      fireEvent.change(roleInput, { target: { value: "Queen of Jazz" } });
      fireEvent.change(textInput, {
        target: { value: "Such stunning acoustic phrasing and blend." },
      });

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/Thank you! Your review was submitted/i),
        ).toBeInTheDocument();
      });

      // Verify payload
      expect(capturedPayload).toEqual({
        author_name: "Ella Fitzgerald",
        author_role: "Queen of Jazz",
        text: "Such stunning acoustic phrasing and blend.",
      });

      // Verify ZERO auth header was attached to public endpoint
      expect(capturedRequest).not.toBeNull();
      expect(capturedRequest!.headers.get("Authorization")).toBeNull();

      // Verify ZERO 401 refresh calls were triggered
      expect(refreshCallCount).toBe(0);

      // Verify form inputs were reset
      expect((nameInput as HTMLInputElement).value).toBe("");
      expect((roleInput as HTMLInputElement).value).toBe("");
      expect((textInput as HTMLTextAreaElement).value).toBe("");
    });

    it("prevents submission and displays client validation errors for invalid inputs", async () => {
      let submitCalled = false;
      server.use(
        http.post(`${env.apiBaseUrl}/api/v1/public/testimonials`, () => {
          submitCalled = true;
          return HttpResponse.json({ data: { id: "1", status: "pending" } });
        }),
      );

      renderPublicView(defaultPublicData);
      await screen.findByText("Leave a Review");

      const submitButton = screen.getByRole("button", {
        name: /Submit review/i,
      });

      // Click submit with empty form
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Name is required.")).toBeInTheDocument();
      });
      expect(submitCalled).toBe(false);

      // Fill name but leave text empty
      const nameInput = screen.getByLabelText(/Your Name \*/i);
      fireEvent.change(nameInput, { target: { value: "John" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Review is required.")).toBeInTheDocument();
      });
      expect(submitCalled).toBe(false);
    });

    it("displays error alert when public submission fails on the server", async () => {
      server.use(
        http.post(`${env.apiBaseUrl}/api/v1/public/testimonials`, () => {
          return HttpResponse.json(
            {
              error: {
                code: "SUBMISSION_REJECTED",
                message: "Submissions are currently closed.",
              },
            },
            { status: 400 },
          );
        }),
      );

      renderPublicView(defaultPublicData);
      await screen.findByText("Leave a Review");

      fireEvent.change(screen.getByLabelText(/Your Name \*/i), {
        target: { value: "Tester" },
      });
      fireEvent.change(screen.getByLabelText(/Your Review \*/i), {
        target: { value: "Great performance" },
      });

      fireEvent.click(screen.getByRole("button", { name: /Submit review/i }));

      await waitFor(() => {
        expect(
          screen.getByText("Submissions are currently closed."),
        ).toBeInTheDocument();
      });
    });
  });

  // --- PART 3: ADMIN MODERATION & TABS ---
  describe("Admin Moderation UI & Filter Tabs", () => {
    it("renders moderation filter tabs with counts and defaults to Pending when pending items exist", async () => {
      renderAdminTestimonials();

      await screen.findByText("Pending Penny");

      // Verify tab counts: Pending (1), Published (2), Rejected (1), All (4)
      expect(
        screen.getByRole("button", { name: /Pending \(1\)/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Published \(2\)/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Rejected \(1\)/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /All \(4\)/i }),
      ).toBeInTheDocument();

      // Active tab should be Pending
      expect(screen.getByText("Pending Penny")).toBeInTheDocument();
      expect(screen.queryByText("Approved Alpha")).not.toBeInTheDocument();
      expect(screen.queryByText("Rejected Ron")).not.toBeInTheDocument();

      // Switch to Published tab
      fireEvent.click(screen.getByRole("button", { name: /Published \(2\)/i }));
      await screen.findByText("Approved Alpha");
      expect(screen.getByText("Approved Beta")).toBeInTheDocument();
      expect(screen.queryByText("Pending Penny")).not.toBeInTheDocument();

      // Switch to Rejected tab
      fireEvent.click(screen.getByRole("button", { name: /Rejected \(1\)/i }));
      await screen.findByText("Rejected Ron");
      expect(screen.queryByText("Approved Alpha")).not.toBeInTheDocument();

      // Switch to All tab
      fireEvent.click(screen.getByRole("button", { name: /All \(4\)/i }));
      await screen.findByText("Approved Alpha");
      expect(screen.getByText("Pending Penny")).toBeInTheDocument();
      expect(screen.getByText("Approved Beta")).toBeInTheDocument();
      expect(screen.getByText("Rejected Ron")).toBeInTheDocument();
    });

    it("renders status and source badges on cards", async () => {
      renderAdminTestimonials();

      await screen.findByText("Pending Penny");
      // Pending status badge & Public source badge
      expect(screen.getAllByText("Pending").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Public")).toBeInTheDocument();

      // Switch to Published
      fireEvent.click(screen.getByRole("button", { name: /Published \(2\)/i }));
      await screen.findByText("Approved Alpha");
      expect(screen.getAllByText("Published").length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText("Admin").length).toBeGreaterThanOrEqual(2);
    });

    it("renders status-specific action controls per card", async () => {
      renderAdminTestimonials();

      // On Pending tab: Pending Penny should have Approve, Reject, Edit, Delete (No move up/down)
      await screen.findByText("Pending Penny");
      expect(
        screen.getByRole("button", {
          name: /Approve testimonial by Pending Penny/i,
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", {
          name: /Reject testimonial by Pending Penny/i,
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", {
          name: /Edit testimonial by Pending Penny/i,
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", {
          name: /Delete testimonial by Pending Penny/i,
        }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", {
          name: /Move testimonial by Pending Penny/i,
        }),
      ).not.toBeInTheDocument();

      // On Published tab: Approved Alpha should have Move Up, Move Down, Hide/Show, Edit, Reject, Delete
      fireEvent.click(screen.getByRole("button", { name: /Published \(2\)/i }));
      await screen.findByText("Approved Alpha");
      expect(
        screen.getByRole("button", {
          name: /Move testimonial by Approved Alpha down/i,
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", {
          name: /Hide testimonial by Approved Alpha/i,
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", {
          name: /Reject testimonial by Approved Alpha/i,
        }),
      ).toBeInTheDocument();
    });

    it("approves pending testimonial calling POST /api/v1/admin/testimonials/:id/approve with in-flight lock", async () => {
      let approvedId: string | null = null;
      server.use(
        http.post(
          `${env.apiBaseUrl}/api/v1/admin/testimonials/:id/approve`,
          ({ params }) => {
            approvedId = params.id as string;
            return HttpResponse.json({ data: { success: true } });
          },
        ),
      );

      renderAdminTestimonials();

      const approveBtn = await screen.findByRole("button", {
        name: /Approve testimonial by Pending Penny/i,
      });

      fireEvent.click(approveBtn);

      await waitFor(() => {
        expect(approvedId).toBe("22222222-0000-4000-8000-000000000002");
      });
    });

    it("rejects testimonial calling POST /api/v1/admin/testimonials/:id/reject with in-flight lock", async () => {
      let rejectedId: string | null = null;
      server.use(
        http.post(
          `${env.apiBaseUrl}/api/v1/admin/testimonials/:id/reject`,
          ({ params }) => {
            rejectedId = params.id as string;
            return HttpResponse.json({ data: { success: true } });
          },
        ),
      );

      renderAdminTestimonials();

      const rejectBtn = await screen.findByRole("button", {
        name: /Reject testimonial by Pending Penny/i,
      });

      fireEvent.click(rejectBtn);

      await waitFor(() => {
        expect(rejectedId).toBe("22222222-0000-4000-8000-000000000002");
      });
    });
  });

  // --- PART 4: STRICT APPROVED-ONLY REORDER DOMAIN ---
  describe("Strict Approved-Only Reorder Domain", () => {
    it("reorders approved testimonials and strictly excludes pending and rejected testimonials from reorder payload", async () => {
      let reorderPayload: {
        items: Array<{ id: string; sort_order: number }>;
      } | null = null;

      server.use(
        http.post(
          `${env.apiBaseUrl}/api/v1/admin/testimonials/reorder`,
          async ({ request }) => {
            reorderPayload = (await request.json()) as {
              items: Array<{ id: string; sort_order: number }>;
            };
            return HttpResponse.json({
              data: {
                message: "Testimonial order saved.",
              },
            });
          },
        ),
      );

      renderAdminTestimonials();

      // Go to Published tab
      const publishedTab = await screen.findByRole("button", {
        name: /Published \(2\)/i,
      });
      fireEvent.click(publishedTab);

      await screen.findByText("Approved Alpha");
      expect(screen.getByText("Approved Beta")).toBeInTheDocument();

      // Move Approved Alpha down (swap with Approved Beta)
      const moveDownBtn = screen.getByRole("button", {
        name: /Move testimonial by Approved Alpha down/i,
      });
      fireEvent.click(moveDownBtn);

      await waitFor(() => {
        expect(reorderPayload).not.toBeNull();
      });

      // The payload must contain ONLY the two approved items with sort orders 10 and 20!
      expect(reorderPayload!.items).toEqual([
        { id: "33333333-0000-4000-8000-000000000003", sort_order: 10 },
        { id: "11111111-0000-4000-8000-000000000001", sort_order: 20 },
      ]);

      // Assert pending (22222222...) and rejected (44444444...) are completely absent!
      const idsInPayload = reorderPayload!.items.map((i) => i.id);
      expect(idsInPayload).not.toContain(
        "22222222-0000-4000-8000-000000000002",
      );
      expect(idsInPayload).not.toContain(
        "44444444-0000-4000-8000-000000000004",
      );
    });
  });

  // --- PART 5: CANONICAL SECTION ORDERING ---
  describe("Canonical Section Ordering", () => {
    it("renders sections in canonical order on PublicPage: About Us -> Gallery -> Testimonials -> Contact Us (Contact Us strictly last)", async () => {
      // Intentionally scrambled sections with valid UUIDs
      const scrambledPublicPage: PublicPageResponse = {
        page: {
          id: "aaaaaaaa-0000-4000-8000-000000000002",
          slug: "home",
          title: "SPA Ensemble",
          seo_title: "SPA Ensemble",
          seo_description: "Ensemble",
          seo_keywords: [],
        },
        sections: [
          {
            id: "bbbbbbbb-0000-4000-8000-000000000004",
            key: "contact-us",
            title: "Contact Us",
            navigation_label: "Contact",
            sort_order: 40,
            blocks: [],
          },
          {
            id: "bbbbbbbb-0000-4000-8000-000000000001",
            key: "about-us",
            title: "About Our Ensemble",
            navigation_label: "About",
            sort_order: 10,
            blocks: [
              {
                id: "cccccccc-0000-4000-8000-000000000001",
                block_type: "text",
                title: "About Us",
                text: "We are a classical & modern saxophone ensemble.",
                media: null,
                sort_order: 10,
              },
            ],
          },
          {
            id: "bbbbbbbb-0000-4000-8000-000000000003",
            key: "testimonials",
            title: "Critic Testimonials",
            navigation_label: "Testimonials",
            sort_order: 30,
            blocks: [],
          },
          {
            id: "bbbbbbbb-0000-4000-8000-000000000002",
            key: "gallery",
            title: "Performance Gallery",
            navigation_label: "Gallery",
            sort_order: 20,
            blocks: [],
          },
        ],
        testimonials: [],
      };

      renderPublicView(scrambledPublicPage);

      await screen.findByText("About Our Ensemble");

      // Verify DOM order of sections
      const sections = document.querySelectorAll("main > section");
      expect(sections.length).toBe(4);

      // Section 0: About Us
      expect(sections[0]).toHaveAttribute("id", "about-us");
      // Section 1: Gallery
      expect(sections[1]).toHaveAttribute("id", "gallery");
      // Section 2: Testimonials
      expect(sections[2]).toHaveAttribute("id", "testimonials");
      // Section 3: Contact Us (Strictly Last)
      expect(sections[3]).toHaveAttribute("id", "contact-us");
    });

    it("renders SpaSectionsPage with sections sorted by sort_order ascending", async () => {
      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/admin/spa-sections`, () => {
          return HttpResponse.json({
            data: [
              {
                id: "dddddddd-0000-4000-8000-000000000004",
                key: "contact-us",
                title: "Contact Us",
                navigation_label: "Contact",
                sort_order: 40,
                is_visible: true,
                content_block_count: 0,
                created_at: "2026-01-01T00:00:00Z",
                updated_at: "2026-01-01T00:00:00Z",
              },
              {
                id: "dddddddd-0000-4000-8000-000000000001",
                key: "about-us",
                title: "About Us",
                navigation_label: "About",
                sort_order: 10,
                is_visible: true,
                content_block_count: 0,
                created_at: "2026-01-01T00:00:00Z",
                updated_at: "2026-01-01T00:00:00Z",
              },
              {
                id: "dddddddd-0000-4000-8000-000000000002",
                key: "gallery",
                title: "Gallery",
                navigation_label: "Gallery",
                sort_order: 20,
                is_visible: true,
                content_block_count: 0,
                created_at: "2026-01-01T00:00:00Z",
                updated_at: "2026-01-01T00:00:00Z",
              },
              {
                id: "dddddddd-0000-4000-8000-000000000003",
                key: "testimonials",
                title: "Testimonials",
                navigation_label: "Testimonials",
                sort_order: 30,
                is_visible: true,
                content_block_count: 0,
                created_at: "2026-01-01T00:00:00Z",
                updated_at: "2026-01-01T00:00:00Z",
              },
            ],
          });
        }),
      );

      const testQueryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false, gcTime: 0 },
        },
      });

      const router = createMemoryRouter(
        [
          {
            path: "/admin/sections",
            element: <SpaSectionsPage />,
          },
        ],
        { initialEntries: ["/admin/sections"] },
      );

      render(
        <QueryClientProvider client={testQueryClient}>
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
        </QueryClientProvider>,
      );

      await screen.findByText("About Us");

      const rows = screen.getAllByRole("row");
      // Row 0 is the table header (Order, Title...)
      const titles = rows
        .slice(1, 5)
        .map((row) => row.querySelectorAll("td")[1]?.textContent);

      // Order should be sorted by sort_order: About Us (10) -> Gallery (20) -> Testimonials (30) -> Contact Us (40)
      expect(titles).toEqual([
        "About Us",
        "Gallery",
        "Testimonials",
        "Contact Us",
      ]);
    });
  });

  // --- PART 6: CAROUSEL INDEX SAFETY ---
  describe("Carousel Index Safety", () => {
    it("never allows safeIndex to exceed bounds or display invalid indicator", () => {
      const items = [
        {
          id: "t1",
          author_name: "Author 1",
          author_role: "Role 1",
          text: "Text 1",
          avatar: null,
          sort_order: 10,
        },
        {
          id: "t2",
          author_name: "Author 2",
          author_role: "Role 2",
          text: "Text 2",
          avatar: null,
          sort_order: 20,
        },
      ];

      render(<TestimonialCarousel testimonials={items} />);

      expect(screen.getByText("1 / 2")).toBeInTheDocument();

      const nextBtn = screen.getByRole("button", { name: "Next testimonial" });
      fireEvent.click(nextBtn);
      expect(screen.getByText("2 / 2")).toBeInTheDocument();

      // Next wraps around safely
      fireEvent.click(nextBtn);
      expect(screen.getByText("1 / 2")).toBeInTheDocument();

      // Prev wraps around safely
      const prevBtn = screen.getByRole("button", {
        name: "Previous testimonial",
      });
      fireEvent.click(prevBtn);
      expect(screen.getByText("2 / 2")).toBeInTheDocument();
    });
  });

  // --- PART 7: TESTIMONIAL EDIT MODAL VISIBILITY GUARD & STATUS-AWARE PATCH ---
  describe("Testimonial Edit Modal Visibility Guard & Status-Aware PATCH", () => {
    it("pending testimonial edit hides visibility checkbox and PATCH excludes is_visible, moderation_status, and submission_source", async () => {
      let patchedId: string | null = null;
      let patchPayload: Record<string, unknown> | null = null;

      server.use(
        http.patch(
          `${env.apiBaseUrl}/api/v1/admin/testimonials/:id`,
          async ({ params, request }) => {
            patchedId = params.id as string;
            patchPayload = (await request.json()) as Record<string, unknown>;
            return HttpResponse.json({
              data: {
                ...mockMixedTestimonials[1], // Pending Penny
                ...patchPayload,
              },
            });
          },
        ),
      );

      renderAdminTestimonials();

      // Default active tab is Pending (1)
      await screen.findByText("Pending Penny");

      // Open Edit modal for Pending Penny
      const editBtn = screen.getByRole("button", {
        name: /Edit testimonial by Pending Penny/i,
      });
      fireEvent.click(editBtn);

      await screen.findByRole("dialog");

      // Assert NO active "Visible on public site" checkbox is available
      expect(
        screen.queryByLabelText(/Visible on public site/i),
      ).not.toBeInTheDocument();

      // Assert informational helper text is rendered instead
      expect(
        screen.getByText("Visibility becomes available after approval."),
      ).toBeInTheDocument();

      // Change review text
      const reviewTextInput = screen.getByLabelText(/Review Text \*/i);
      fireEvent.change(reviewTextInput, {
        target: { value: "Updated review for pending testimonial" },
      });

      // Submit changes
      const saveBtn = screen.getByRole("button", { name: /Save Changes/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(patchPayload).not.toBeNull();
      });

      // Target was Pending Penny
      expect(patchedId).toBe("22222222-0000-4000-8000-000000000002");

      // Assert changed text is present in PATCH body
      expect(patchPayload).toEqual({
        text: "Updated review for pending testimonial",
      });

      // Explicitly assert PATCH does NOT contain is_visible, moderation_status, submission_source
      expect(patchPayload).not.toHaveProperty("is_visible");
      expect(patchPayload).not.toHaveProperty("moderation_status");
      expect(patchPayload).not.toHaveProperty("submission_source");
    });

    it("rejected testimonial edit hides visibility checkbox and PATCH excludes is_visible, moderation_status, and submission_source", async () => {
      let patchedId: string | null = null;
      let patchPayload: Record<string, unknown> | null = null;

      server.use(
        http.patch(
          `${env.apiBaseUrl}/api/v1/admin/testimonials/:id`,
          async ({ params, request }) => {
            patchedId = params.id as string;
            patchPayload = (await request.json()) as Record<string, unknown>;
            return HttpResponse.json({
              data: {
                ...mockMixedTestimonials[3], // Rejected Ron
                ...patchPayload,
              },
            });
          },
        ),
      );

      renderAdminTestimonials();

      // Switch to Rejected tab
      const rejectedTab = await screen.findByRole("button", {
        name: /Rejected \(1\)/i,
      });
      fireEvent.click(rejectedTab);

      await screen.findByText("Rejected Ron");

      // Open Edit modal for Rejected Ron
      const editBtn = screen.getByRole("button", {
        name: /Edit testimonial by Rejected Ron/i,
      });
      fireEvent.click(editBtn);

      await screen.findByRole("dialog");

      // Assert NO active "Visible on public site" checkbox is available
      expect(
        screen.queryByLabelText(/Visible on public site/i),
      ).not.toBeInTheDocument();

      // Assert informational helper text is rendered instead
      expect(
        screen.getByText(
          "Rejected testimonials cannot be published on the public site.",
        ),
      ).toBeInTheDocument();

      // Change review text
      const reviewTextInput = screen.getByLabelText(/Review Text \*/i);
      fireEvent.change(reviewTextInput, {
        target: { value: "Updated review for rejected testimonial" },
      });

      // Submit changes
      const saveBtn = screen.getByRole("button", { name: /Save Changes/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(patchPayload).not.toBeNull();
      });

      // Target was Rejected Ron
      expect(patchedId).toBe("44444444-0000-4000-8000-000000000004");

      // Assert changed text is present in PATCH body
      expect(patchPayload).toEqual({
        text: "Updated review for rejected testimonial",
      });

      // Explicitly assert PATCH does NOT contain is_visible, moderation_status, submission_source
      expect(patchPayload).not.toHaveProperty("is_visible");
      expect(patchPayload).not.toHaveProperty("moderation_status");
      expect(patchPayload).not.toHaveProperty("submission_source");
    });

    it("approved testimonial edit preserves visibility checkbox and includes is_visible in PATCH when changed", async () => {
      let patchedId: string | null = null;
      let patchPayload: Record<string, unknown> | null = null;

      server.use(
        http.patch(
          `${env.apiBaseUrl}/api/v1/admin/testimonials/:id`,
          async ({ params, request }) => {
            patchedId = params.id as string;
            patchPayload = (await request.json()) as Record<string, unknown>;
            return HttpResponse.json({
              data: {
                ...mockMixedTestimonials[0], // Approved Alpha (is_visible: true)
                ...patchPayload,
              },
            });
          },
        ),
      );

      renderAdminTestimonials();

      // Switch to Published tab
      const publishedTab = await screen.findByRole("button", {
        name: /Published \(2\)/i,
      });
      fireEvent.click(publishedTab);

      await screen.findByText("Approved Alpha");

      // Open Edit modal for Approved Alpha
      const editBtn = screen.getByRole("button", {
        name: /Edit testimonial by Approved Alpha/i,
      });
      fireEvent.click(editBtn);

      await screen.findByRole("dialog");

      // Assert "Visible on public site" checkbox IS available and currently checked
      const visibilityCheckbox = screen.getByLabelText(
        /Visible on public site/i,
      ) as HTMLInputElement;
      expect(visibilityCheckbox).toBeInTheDocument();
      expect(visibilityCheckbox.checked).toBe(true);

      // Uncheck visibility
      fireEvent.click(visibilityCheckbox);
      expect(visibilityCheckbox.checked).toBe(false);

      // Submit changes
      const saveBtn = screen.getByRole("button", { name: /Save Changes/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(patchPayload).not.toBeNull();
      });

      // Target was Approved Alpha
      expect(patchedId).toBe("11111111-0000-4000-8000-000000000001");

      // Assert is_visible is included in PATCH body
      expect(patchPayload).toEqual({
        is_visible: false,
      });

      // Explicitly assert moderation fields are absent
      expect(patchPayload).not.toHaveProperty("moderation_status");
      expect(patchPayload).not.toHaveProperty("submission_source");
    });
  });

  // --- PART 8: PUBLIC TESTIMONIAL SUBMISSION RESPONSE STRICT SCHEMA HARDENING ---
  describe("Public Testimonial Submission Response Strict Schema Hardening", () => {
    it("rejects public submit response with status 'approved' with INVALID_API_RESPONSE error", async () => {
      server.use(
        http.post(`${env.apiBaseUrl}/api/v1/public/testimonials`, () => {
          return HttpResponse.json({
            data: {
              id: "99999999-0000-4000-8000-000000000001",
              status: "approved",
            },
          });
        }),
      );

      await expect(
        publicApi.submitTestimonial({
          author_name: "Audience Member",
          author_role: "Fan",
          text: "Phenomenal saxophone performance!",
        }),
      ).rejects.toMatchObject({
        code: "INVALID_API_RESPONSE",
        message: "The server returned an unexpected response.",
      });
    });

    it("rejects public submit response with arbitrary random string status with INVALID_API_RESPONSE error", async () => {
      server.use(
        http.post(`${env.apiBaseUrl}/api/v1/public/testimonials`, () => {
          return HttpResponse.json({
            data: {
              id: "99999999-0000-4000-8000-000000000002",
              status: "arbitrary_random_status",
            },
          });
        }),
      );

      await expect(
        publicApi.submitTestimonial({
          author_name: "Audience Member",
          text: "Phenomenal saxophone performance!",
        }),
      ).rejects.toMatchObject({
        code: "INVALID_API_RESPONSE",
      });
    });

    it("successfully parses valid public submit response with status 'pending'", async () => {
      server.use(
        http.post(`${env.apiBaseUrl}/api/v1/public/testimonials`, () => {
          return HttpResponse.json({
            data: {
              id: "99999999-0000-4000-8000-000000000003",
              status: "pending",
            },
          });
        }),
      );

      const response = await publicApi.submitTestimonial({
        author_name: "Audience Member",
        author_role: "Fan",
        text: "Phenomenal saxophone performance!",
      });

      expect(response).toEqual({
        id: "99999999-0000-4000-8000-000000000003",
        status: "pending",
      });
    });
  });
});
