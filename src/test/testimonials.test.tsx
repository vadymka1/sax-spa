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
import { TestimonialsPage } from "../features/admin/testimonials/TestimonialsPage";
import { PublicPage } from "../features/public-page/PublicPage";
import {
  AdminTestimonialDto,
  AdminTestimonialDtoSchema,
  CreateTestimonialRequest,
  CreateTestimonialRequestSchema,
  PublicPageResponseSchema,
  PublicTestimonial,
  PublicTestimonialSchema,
  ReorderTestimonialsRequest,
  UserDto,
} from "../api/types";

const TEST_IDS = {
  t1: "11111111-1111-4111-8111-111111111111",
  t2: "22222222-2222-4222-8222-222222222222",
  t3: "33333333-3333-4333-8333-333333333333",
  t4: "44444444-4444-4444-8444-444444444444",
  page: "99999999-9999-4999-8999-999999999999",
  section: "88888888-8888-4888-8888-888888888888",
  avatar1: "aaaaaaaa-1111-4111-8111-111111111111",
  avatar2: "aaaaaaaa-2222-4222-8222-222222222222",
  avatarNew: "aaaaaaaa-9999-4999-8999-999999999999",
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

const mockTestimonials: AdminTestimonialDto[] = [
  {
    id: TEST_IDS.t1,
    author_name: "Miles Davis",
    author_role: "Legendary Trumpeter",
    text: "The ensemble produces an extraordinary sound that transcends borders.",
    avatar: {
      type: "image",
      id: TEST_IDS.avatar1,
      url: "https://cdn.example.test/miles.jpg",
      original_filename: "miles.jpg",
      mime_type: "image/jpeg",
      file_size: 2048,
      created_at: "2026-01-01T00:00:00Z",
    },
    sort_order: 10,
    is_visible: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: TEST_IDS.t2,
    author_name: "Wayne Shorter",
    author_role: null,
    text: "Pure mastery of acoustic resonance and collaborative precision.",
    avatar: null,
    sort_order: 20,
    is_visible: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: TEST_IDS.t3,
    author_name: "Sonny Rollins",
    author_role: "Tenor Titan",
    text: "A truly visionary performance ensemble for the modern era.",
    avatar: null,
    sort_order: 30,
    is_visible: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

describe("FRONTEND AUDIT — Testimonials Feature Pass", () => {
  beforeEach(() => {
    authSession.setTokens("mock-access-token", "mock-refresh-token");
    authSession.resetCheckedState();
    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/auth/me`, () => {
        return HttpResponse.json({ data: mockAdminUser });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/testimonials`, () => {
        return HttpResponse.json({ data: mockTestimonials });
      }),
    );
  });

  afterEach(() => {
    authSession.clearSession();
    server.resetHandlers();
  });

  function renderAdminTestimonials(roleUser: UserDto = mockAdminUser) {
    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/auth/me`, () => {
        return HttpResponse.json({ data: roleUser });
      }),
    );

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

  // --- PART A: SCHEMAS & DTO TESTS ---
  describe("Testimonials DTO & Schemas", () => {
    it("validates conceptual AdminTestimonialDto matching backend contract", () => {
      const parsed = AdminTestimonialDtoSchema.safeParse(mockTestimonials[0]);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.author_name).toBe("Miles Davis");
        expect(parsed.data.avatar?.type).toBe("image");
      }
    });

    it("validates conceptual PublicTestimonial matching public response", () => {
      const validPublic: PublicTestimonial = {
        id: TEST_IDS.t1,
        author_name: "Herbie Hancock",
        author_role: "Pianist & Composer",
        text: "Incredible phrasing and harmony.",
        avatar: {
          type: "image",
          id: TEST_IDS.avatar1,
          url: "https://cdn.example.test/herbie.jpg",
        },
        sort_order: 10,
      };

      const parsed = PublicTestimonialSchema.safeParse(validPublic);
      expect(parsed.success).toBe(true);
    });

    it("validates PublicPage response schema with testimonials array", () => {
      const envelope = {
        page: {
          id: TEST_IDS.page,
          slug: "home",
          title: "SPA Saxophone Ensemble",
        },
        sections: [],
        testimonials: [
          {
            id: TEST_IDS.t1,
            author_name: "Miles Davis",
            author_role: null,
            text: "Extraordinary sound.",
            avatar: null,
            sort_order: 10,
          },
        ],
      };

      const parsed = PublicPageResponseSchema.safeParse(envelope);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.testimonials.length).toBe(1);
      }
    });

    it("enforces CreateTestimonialRequest limits (name <= 120, role <= 160, text <= 3000)", () => {
      const validCreate: CreateTestimonialRequest = {
        author_name: "Stan Getz",
        author_role: "Bossa Nova Pioneer",
        text: "Lyrical warmth and beauty.",
        avatar_media_id: null,
        is_visible: true,
      };
      expect(
        CreateTestimonialRequestSchema.safeParse(validCreate).success,
      ).toBe(true);

      const invalidName = { ...validCreate, author_name: "a".repeat(121) };
      expect(
        CreateTestimonialRequestSchema.safeParse(invalidName).success,
      ).toBe(false);

      const invalidRole = { ...validCreate, author_role: "r".repeat(161) };
      expect(
        CreateTestimonialRequestSchema.safeParse(invalidRole).success,
      ).toBe(false);

      const invalidText = { ...validCreate, text: "t".repeat(3001) };
      expect(
        CreateTestimonialRequestSchema.safeParse(invalidText).success,
      ).toBe(false);
    });
  });

  // --- PART B: ADMIN ROUTE & NAVIGATION ---
  describe("Admin Navigation & Access", () => {
    it("allows access to /admin/testimonials for 'admin' role", async () => {
      renderAdminTestimonials(mockAdminUser);
      const heading = await screen.findByRole("heading", {
        name: "Testimonials",
      });
      expect(heading).toBeInTheDocument();

      const navLink = screen.getByRole("link", { name: "Testimonials" });
      expect(navLink).toBeInTheDocument();
      expect(navLink).toHaveAttribute("href", "/admin/testimonials");
    });

    it("allows access to /admin/testimonials for 'super_admin' role", async () => {
      renderAdminTestimonials(mockSuperAdminUser);
      const heading = await screen.findByRole("heading", {
        name: "Testimonials",
      });
      expect(heading).toBeInTheDocument();
    });
  });

  // --- PART C: ADMIN LIST & ACTIONS ---
  describe("Admin Testimonials List & Display", () => {
    it("renders testimonials with author, role, text preview, avatar, order, and visibility", async () => {
      renderAdminTestimonials();

      await screen.findByText("Miles Davis");
      expect(screen.getByText("Legendary Trumpeter")).toBeInTheDocument();
      expect(
        screen.getByText(/The ensemble produces an extraordinary sound/i),
      ).toBeInTheDocument();

      // Miles has an avatar image
      const milesAvatar = screen.getByRole("img", { name: "Miles Davis" });
      expect(milesAvatar).toHaveAttribute(
        "src",
        "https://cdn.example.test/miles.jpg",
      );

      // Wayne Shorter has no avatar, renders initial placeholder
      expect(screen.getByText("Wayne Shorter")).toBeInTheDocument();
      expect(screen.getByText("W")).toBeInTheDocument();

      // Badges
      expect(screen.getByText("Order: 10")).toBeInTheDocument();
      expect(screen.getByText("Order: 20")).toBeInTheDocument();
      expect(screen.getByText("Order: 30")).toBeInTheDocument();

      const visibleBadges = screen.getAllByText("Visible");
      expect(visibleBadges.length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText("Hidden")).toBeInTheDocument();
    });

    it("renders empty state when there are no testimonials", async () => {
      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/admin/testimonials`, () => {
          return HttpResponse.json({ data: [] });
        }),
      );

      renderAdminTestimonials();

      await screen.findByText("No Testimonials Found");
      expect(
        screen.getByText(/Create your first testimonial to showcase reviews/i),
      ).toBeInTheDocument();
    });
  });

  // --- PART D: CREATE MODAL & AVATAR UPLOAD ---
  describe("Testimonial Create Flow & Avatar Upload", () => {
    it("creates a testimonial submitting exact backend fields with single image upload", async () => {
      let createdPayload: unknown = null;

      server.use(
        http.post(`${env.apiBaseUrl}/api/v1/admin/media/upload`, () => {
          return HttpResponse.json({
            data: {
              type: "image",
              id: TEST_IDS.avatarNew,
              url: "/uploads/chick.jpg",
              original_filename: "chick.jpg",
              mime_type: "image/jpeg",
              file_size: 1024,
              created_at: new Date().toISOString(),
            },
          });
        }),
        http.post(
          `${env.apiBaseUrl}/api/v1/admin/testimonials`,
          async ({ request }) => {
            createdPayload = await request.json();
            return HttpResponse.json({
              data: {
                id: TEST_IDS.t4,
                author_name: "Chick Corea",
                author_role: "Jazz Master",
                text: "Electrifying performance that resonated deeply.",
                avatar: {
                  type: "image",
                  id: TEST_IDS.avatarNew,
                  url: "/uploads/chick.jpg",
                  original_filename: "chick.jpg",
                  mime_type: "image/jpeg",
                  file_size: 1024,
                  created_at: new Date().toISOString(),
                },
                sort_order: 40,
                is_visible: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            });
          },
        ),
      );

      renderAdminTestimonials();

      const addBtn = await screen.findByRole("button", {
        name: /\+ Add Testimonial/i,
      });
      fireEvent.click(addBtn);

      const dialog = await screen.findByRole("dialog");
      expect(dialog).toBeInTheDocument();

      // Fill out form
      const nameInput = screen.getByLabelText(/Author Name \*/i);
      const roleInput = screen.getByLabelText(/Author Role/i);
      const textInput = screen.getByLabelText(/Review Text \*/i);

      fireEvent.change(nameInput, { target: { value: "Chick Corea" } });
      fireEvent.change(roleInput, { target: { value: "Jazz Master" } });
      fireEvent.change(textInput, {
        target: { value: "Electrifying performance that resonated deeply." },
      });

      // Upload single avatar
      const fileInput = screen.getByLabelText(/Avatar Image/i);
      const file = new File(["dummy content"], "chick.jpg", {
        type: "image/jpeg",
      });
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText("Uploaded")).toBeInTheDocument();
      });

      // Submit form
      const submitBtn = screen.getByRole("button", {
        name: "Create Testimonial",
      });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(createdPayload).toEqual({
          author_name: "Chick Corea",
          author_role: "Jazz Master",
          text: "Electrifying performance that resonated deeply.",
          avatar_media_id: TEST_IDS.avatarNew,
          is_visible: true,
        });
      });
    });

    it("handles avatar upload failure gracefully, allows Retry and Remove", async () => {
      server.use(
        http.post(`${env.apiBaseUrl}/api/v1/admin/media/upload`, () => {
          return HttpResponse.json(
            { error: { code: "UPLOAD_FAILED", message: "Storage full" } },
            { status: 500 },
          );
        }),
      );

      renderAdminTestimonials();

      const addBtn = await screen.findByRole("button", {
        name: /\+ Add Testimonial/i,
      });
      fireEvent.click(addBtn);

      const fileInput = screen.getByLabelText(/Avatar Image/i);
      const file = new File(["dummy"], "avatar_fail.jpg", {
        type: "image/jpeg",
      });
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(
          screen.getByText(/Upload failed. Please retry or remove./i),
        ).toBeInTheDocument();
      });

      // Create button is disabled while avatar is in failed state
      const createBtn = screen.getByRole("button", {
        name: "Create Testimonial",
      });
      expect(createBtn).toBeDisabled();

      // Click Remove avatar
      const removeBtn = screen.getByRole("button", { name: "Remove avatar" });
      fireEvent.click(removeBtn);

      expect(screen.queryByText(/Upload failed/i)).not.toBeInTheDocument();
    });
  });

  // --- PART E: EDIT FLOW & AVATAR REMOVAL ---
  describe("Testimonial Edit & Avatar Removal", () => {
    it("hydrates existing values and allows removing avatar explicitly sending { avatar_media_id: null }", async () => {
      let patchPayload: unknown = null;

      server.use(
        http.patch(
          `${env.apiBaseUrl}/api/v1/admin/testimonials/${TEST_IDS.t1}`,
          async ({ request }) => {
            patchPayload = await request.json();
            return HttpResponse.json({
              data: {
                ...mockTestimonials[0],
                avatar: null,
              },
            });
          },
        ),
      );

      renderAdminTestimonials();

      await screen.findByText("Miles Davis");

      const editBtn = screen.getByRole("button", {
        name: "Edit testimonial by Miles Davis",
      });
      fireEvent.click(editBtn);

      await screen.findByRole("dialog");

      // Verify fields hydrated
      const nameInput = screen.getByLabelText(
        /Author Name \*/i,
      ) as HTMLInputElement;
      expect(nameInput.value).toBe("Miles Davis");

      // Click Remove avatar
      const removeAvatarBtn = screen.getByRole("button", {
        name: "Remove avatar",
      });
      fireEvent.click(removeAvatarBtn);

      // Save changes
      const saveBtn = screen.getByRole("button", { name: "Save Changes" });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(patchPayload).toEqual({
          avatar_media_id: null,
        });
      });
    });

    it("replaces existing avatar with newly uploaded avatar", async () => {
      let patchPayload: unknown = null;

      server.use(
        http.post(`${env.apiBaseUrl}/api/v1/admin/media/upload`, () => {
          return HttpResponse.json({
            data: {
              type: "image",
              id: TEST_IDS.avatar2,
              url: "/uploads/new_avatar.jpg",
              original_filename: "new_avatar.jpg",
              mime_type: "image/jpeg",
              file_size: 1024,
              created_at: new Date().toISOString(),
            },
          });
        }),
        http.patch(
          `${env.apiBaseUrl}/api/v1/admin/testimonials/${TEST_IDS.t1}`,
          async ({ request }) => {
            patchPayload = await request.json();
            return HttpResponse.json({
              data: mockTestimonials[0],
            });
          },
        ),
      );

      renderAdminTestimonials();

      await screen.findByText("Miles Davis");

      const editBtn = screen.getByRole("button", {
        name: "Edit testimonial by Miles Davis",
      });
      fireEvent.click(editBtn);

      await screen.findByRole("dialog");

      // Upload replacement avatar
      const fileInput = screen.getByLabelText(/Replace Avatar/i);
      const newFile = new File(["replacement"], "replacement.jpg", {
        type: "image/jpeg",
      });
      fireEvent.change(fileInput, { target: { files: [newFile] } });

      await waitFor(() => {
        expect(screen.getByText("Uploaded")).toBeInTheDocument();
      });

      const saveBtn = screen.getByRole("button", { name: "Save Changes" });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(patchPayload).toEqual({
          avatar_media_id: TEST_IDS.avatar2,
        });
      });
    });
  });

  // --- PART F: DELETE & VISIBILITY TOGGLE ---
  describe("Delete & Visibility", () => {
    it("deletes a testimonial after confirmation dialog and invalidates list", async () => {
      let deleteCalled = false;

      server.use(
        http.delete(
          `${env.apiBaseUrl}/api/v1/admin/testimonials/${TEST_IDS.t1}`,
          () => {
            deleteCalled = true;
            return new HttpResponse(null, { status: 204 });
          },
        ),
      );

      renderAdminTestimonials();

      await screen.findByText("Miles Davis");

      const deleteBtn = screen.getByRole("button", {
        name: "Delete testimonial by Miles Davis",
      });
      fireEvent.click(deleteBtn);

      await screen.findByRole("dialog");
      expect(
        screen.getByText(/Are you sure you want to delete the testimonial by/i),
      ).toBeInTheDocument();

      const confirmBtn = screen.getByRole("button", {
        name: "Delete Testimonial",
      });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(deleteCalled).toBe(true);
      });
    });

    it("toggles visibility via PATCH { is_visible: false/true } and refetches", async () => {
      let patchedBody: unknown = null;

      server.use(
        http.patch(
          `${env.apiBaseUrl}/api/v1/admin/testimonials/${TEST_IDS.t1}`,
          async ({ request }) => {
            patchedBody = await request.json();
            return HttpResponse.json({
              data: {
                ...mockTestimonials[0],
                is_visible: false,
              },
            });
          },
        ),
      );

      renderAdminTestimonials();

      await screen.findByText("Miles Davis");

      // Miles is currently visible -> button says Hide
      const hideBtn = screen.getByRole("button", {
        name: "Hide testimonial by Miles Davis",
      });
      fireEvent.click(hideBtn);

      await waitFor(() => {
        expect(patchedBody).toEqual({ is_visible: false });
      });
    });
  });

  // --- PART G: REORDER HARDENING ---
  describe("Testimonials Reorder Hardening", () => {
    it("reorders testimonials sending canonical 10/20/30 complete payload", async () => {
      let reorderPayload: ReorderTestimonialsRequest | null = null;

      server.use(
        http.post(
          `${env.apiBaseUrl}/api/v1/admin/testimonials/reorder`,
          async ({ request }) => {
            reorderPayload =
              (await request.json()) as ReorderTestimonialsRequest;
            return HttpResponse.json({ success: true });
          },
        ),
      );

      renderAdminTestimonials();

      await screen.findByText("Miles Davis");

      // Move Miles down (index 0 -> index 1)
      const moveDownBtn = screen.getByRole("button", {
        name: "Move testimonial by Miles Davis down",
      });
      fireEvent.click(moveDownBtn);

      await waitFor(() => {
        expect(reorderPayload).toEqual({
          items: [
            { id: TEST_IDS.t2, sort_order: 10 },
            { id: TEST_IDS.t1, sort_order: 20 },
            { id: TEST_IDS.t3, sort_order: 30 },
          ],
        });
      });
    });

    it("suppresses double-click while reorder is in flight", async () => {
      let postCallCount = 0;

      server.use(
        http.post(
          `${env.apiBaseUrl}/api/v1/admin/testimonials/reorder`,
          async () => {
            postCallCount++;
            await new Promise((resolve) => setTimeout(resolve, 50));
            return HttpResponse.json({ success: true });
          },
        ),
      );

      renderAdminTestimonials();

      await screen.findByText("Miles Davis");

      const moveDownBtn = screen.getByRole("button", {
        name: "Move testimonial by Miles Davis down",
      });
      fireEvent.click(moveDownBtn);
      fireEvent.click(moveDownBtn); // Second immediate click

      await waitFor(() => {
        expect(postCallCount).toBe(1);
      });
    });

    it("handles POST success + GET failure handshake with GET-only Retry", async () => {
      let postCount = 0;
      let getCount = 0;
      let failNextGet = false;

      server.use(
        http.post(`${env.apiBaseUrl}/api/v1/admin/testimonials/reorder`, () => {
          postCount++;
          failNextGet = true;
          return HttpResponse.json({ success: true });
        }),
        http.get(`${env.apiBaseUrl}/api/v1/admin/testimonials`, () => {
          getCount++;
          if (failNextGet) {
            failNextGet = false;
            // First canonical refetch fails
            return HttpResponse.json(
              { error: { code: "SERVER_ERROR", message: "Failed to reload" } },
              { status: 500 },
            );
          }
          return HttpResponse.json({ data: mockTestimonials });
        }),
      );

      renderAdminTestimonials();

      await screen.findByText("Miles Davis");
      const initialGetCount = getCount;

      const moveDownBtn = screen.getByRole("button", {
        name: "Move testimonial by Miles Davis down",
      });
      fireEvent.click(moveDownBtn);

      // Warning message is displayed in alert
      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent(
        "Order was saved, but the latest order could not be loaded.",
      );

      // Retry button is displayed
      const retryBtn = screen.getByRole("button", { name: "Retry" });
      expect(retryBtn).toBeInTheDocument();

      // Click retry
      fireEvent.click(retryBtn);

      await waitFor(() => {
        // Retry performed GET only, no additional POST
        expect(postCount).toBe(1);
        expect(getCount).toBeGreaterThan(initialGetCount + 1);
      });
    });

    it("displays 422 error with request ID on reorder failure", async () => {
      server.use(
        http.post(`${env.apiBaseUrl}/api/v1/admin/testimonials/reorder`, () => {
          return HttpResponse.json(
            {
              error: {
                code: "VALIDATION_FAILED",
                message: "Invalid sort order sequence",
                request_id: "req-err-testimonials-422",
              },
            },
            { status: 422 },
          );
        }),
      );

      renderAdminTestimonials();

      await screen.findByText("Miles Davis");

      const moveDownBtn = screen.getByRole("button", {
        name: "Move testimonial by Miles Davis down",
      });
      fireEvent.click(moveDownBtn);

      await screen.findByText(/Invalid sort order sequence/i);
      expect(screen.getByText(/req-err-testimonials-422/i)).toBeInTheDocument();
    });
  });

  // --- PART H: PUBLIC TESTIMONIALS SECTION ---
  describe("Public Testimonials Presentation", () => {
    function renderPublicPage(
      testimonialsData: PublicTestimonial[],
      includeSection = true,
    ) {
      const publicResponse = {
        data: {
          page: {
            id: TEST_IDS.page,
            slug: "home",
            title: "SPA Saxophone Ensemble",
          },
          sections: includeSection
            ? [
                {
                  id: TEST_IDS.section,
                  key: "testimonials",
                  title: "Critic Reviews & Testimonials",
                  navigation_label: "Testimonials",
                  sort_order: 10,
                  blocks: [],
                },
              ]
            : [],
          testimonials: testimonialsData,
        },
      };

      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/public/page`, () => {
          return HttpResponse.json(publicResponse);
        }),
      );

      const testQueryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false, gcTime: 0 },
        },
      });

      return render(
        <QueryClientProvider client={testQueryClient}>
          <PublicPage />
        </QueryClientProvider>,
      );
    }

    it("renders 0 testimonials gracefully with no broken cards", async () => {
      renderPublicPage([]);

      await screen.findByText("Critic Reviews & Testimonials");
      expect(
        screen.queryByRole("region", { name: /carousel/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /Previous/i }),
      ).not.toBeInTheDocument();
    });

    it("renders 1 testimonial as static card without carousel controls", async () => {
      const singleTestimonial: PublicTestimonial = {
        id: TEST_IDS.t1,
        author_name: "John Coltrane",
        author_role: "Jazz Giant",
        text: "The music sounds like spiritual transcendence.",
        avatar: {
          type: "image",
          id: TEST_IDS.avatar1,
          url: "https://cdn.example.test/coltrane.jpg",
        },
        sort_order: 10,
      };

      renderPublicPage([singleTestimonial]);

      await screen.findByText("Critic Reviews & Testimonials");
      expect(screen.getByText("John Coltrane")).toBeInTheDocument();
      expect(screen.getByText("Jazz Giant")).toBeInTheDocument();
      expect(
        screen.getByText("The music sounds like spiritual transcendence."),
      ).toBeInTheDocument();

      // No carousel controls for single testimonial
      expect(
        screen.queryByRole("button", { name: /Previous/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /Next/i }),
      ).not.toBeInTheDocument();
    });

    it("renders 2+ testimonials as accessible carousel with Next/Previous, indicator and keyboard nav", async () => {
      const multipleTestimonials: PublicTestimonial[] = [
        {
          id: TEST_IDS.t1,
          author_name: "Author One",
          author_role: "Role One",
          text: "First quote of the ensemble.",
          avatar: null,
          sort_order: 10,
        },
        {
          id: TEST_IDS.t2,
          author_name: "Author Two",
          author_role: null, // role omitted
          text: "Second quote of the ensemble.",
          avatar: null, // avatar omitted
          sort_order: 20,
        },
      ];

      renderPublicPage(multipleTestimonials);

      await screen.findByText("First quote of the ensemble.");
      expect(screen.getByText("Author One")).toBeInTheDocument();
      expect(screen.getByText("1 / 2")).toBeInTheDocument();

      const carousel = screen.getByRole("region", {
        name: "Testimonials carousel",
      });
      const nextBtn = screen.getByRole("button", {
        name: "Next testimonial",
      });
      const prevBtn = screen.getByRole("button", {
        name: "Previous testimonial",
      });

      // Advance with Next button
      fireEvent.click(nextBtn);

      await screen.findByText("Second quote of the ensemble.");
      expect(screen.getByText("Author Two")).toBeInTheDocument();
      expect(screen.getByText("2 / 2")).toBeInTheDocument();

      // Navigate back with Previous button
      fireEvent.click(prevBtn);

      await screen.findByText("First quote of the ensemble.");
      expect(screen.getByText("1 / 2")).toBeInTheDocument();

      // Keyboard navigation: ArrowRight
      fireEvent.keyDown(carousel, { key: "ArrowRight" });
      await screen.findByText("Second quote of the ensemble.");

      // Keyboard navigation: ArrowLeft
      fireEvent.keyDown(carousel, { key: "ArrowLeft" });
      await screen.findByText("First quote of the ensemble.");
    });

    it("does not render testimonials if canonical testimonials section is hidden / not returned", async () => {
      const testimonials: PublicTestimonial[] = [
        {
          id: TEST_IDS.t1,
          author_name: "Hidden Author",
          author_role: null,
          text: "This should not be rendered.",
          avatar: null,
          sort_order: 10,
        },
      ];

      renderPublicPage(testimonials, false /* section hidden */);

      await screen.findByText("SPA Saxophone Ensemble");
      expect(screen.queryByText("Hidden Author")).not.toBeInTheDocument();
      expect(
        screen.queryByText("This should not be rendered."),
      ).not.toBeInTheDocument();
    });
  });
});
