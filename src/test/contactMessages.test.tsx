import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { server } from "./msw/server";
import { authSession } from "../features/auth/authSession";
import { env } from "../lib/env";
import { AdminContactMessageDto, UserDto } from "../api/types";
import { AuthProvider } from "../features/auth/AuthProvider";
import { ProtectedAdminRoute } from "../features/auth/ProtectedAdminRoute";
import { AdminLayout } from "../features/admin/AdminLayout";
import { ContactMessagesPage } from "../features/admin/contact-messages/ContactMessagesPage";
import { LoginPage } from "../features/auth/LoginPage";
import { contactMessagesApi } from "../api/contactMessagesApi";

const mockAdminUser: UserDto = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "admin@example.test",
  display_name: "Admin User",
  role: "admin",
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const mockSuperAdminUser: UserDto = {
  id: "00000000-0000-4000-8000-000000000002",
  email: "superadmin@example.test",
  display_name: "Super Admin",
  role: "super_admin",
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const mockMessages: AdminContactMessageDto[] = [
  {
    id: "aaaaaaaa-0000-4000-8000-000000000001",
    name: "Anna Smith",
    email: "anna@example.com",
    subject: "Booking inquiry for festival",
    message:
      "Hello, we would love to book the ensemble for our summer jazz festival.",
    email_status: "sent",
    email_error: null,
    email_sent_at: "2026-09-13T14:35:00Z",
    is_read: false,
    read_at: null,
    created_at: "2026-09-13T14:30:00Z",
    updated_at: "2026-09-13T14:35:00Z",
  },
  {
    id: "bbbbbbbb-0000-4000-8000-000000000002",
    name: "Bob Jones",
    email: "bob@example.com",
    subject: "Private masterclass request",
    message: "Are any quartet members available for masterclasses next month?",
    email_status: "failed",
    email_error: "SMTP connect error: 554 Transaction failed",
    email_sent_at: null,
    is_read: true,
    read_at: "2026-09-13T12:00:00Z",
    created_at: "2026-09-13T11:00:00Z",
    updated_at: "2026-09-13T12:00:00Z",
  },
  {
    id: "cccccccc-0000-4000-8000-000000000003",
    name: "Charlie Parker",
    email: "charlie@example.com",
    subject: null, // No subject
    message: "Loved the recent recording of the quartet arrangements.",
    email_status: "disabled",
    email_error: null,
    email_sent_at: null,
    is_read: true,
    read_at: "2026-09-12T10:00:00Z",
    created_at: "2026-09-12T09:00:00Z",
    updated_at: "2026-09-12T10:00:00Z",
  },
  {
    id: "dddddddd-0000-4000-8000-000000000004",
    name: "Diana Krall",
    email: "diana@example.com",
    subject: "Collaboration proposal",
    message: "Interested in discussing a collaborative performance project.",
    email_status: "pending",
    email_error: null,
    email_sent_at: null,
    is_read: false,
    read_at: null,
    created_at: "2026-09-13T15:00:00Z", // Newest message
    updated_at: "2026-09-13T15:00:00Z",
  },
];

describe("FRONTEND CONTACT V2 — ADMIN CONTACT MESSAGES INBOX", () => {
  beforeEach(() => {
    authSession.setTokens("mock-access-token", "mock-refresh-token");
    authSession.resetCheckedState();
    server.use(
      http.get(`${env.apiBaseUrl}/api/v1/auth/me`, () => {
        return HttpResponse.json({ data: mockAdminUser });
      }),
      http.get(`${env.apiBaseUrl}/api/v1/admin/contact-messages`, () => {
        return HttpResponse.json({ data: mockMessages });
      }),
    );
  });

  afterEach(() => {
    authSession.clearSession();
    server.resetHandlers();
  });

  function renderAdminInbox(initialPath = "/admin/contact-messages") {
    const testQueryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
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
                  path: "contact-messages",
                  element: <ContactMessagesPage />,
                },
              ],
            },
          ],
        },
      ],
      { initialEntries: [initialPath] },
    );

    return render(
      <QueryClientProvider client={testQueryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </QueryClientProvider>,
    );
  }

  // --- PART 1: ROUTING & AUTH PERMISSIONS ---
  describe("Routing & Permissions", () => {
    it("allows authenticated admin to access /admin/contact-messages and renders sidebar navigation", async () => {
      renderAdminInbox();

      expect(await screen.findByText("Contact Messages")).toBeInTheDocument();
      // Navigation link exists
      const navLink = screen.getByRole("link", { name: /Contact Messages/i });
      expect(navLink).toBeInTheDocument();
      expect(navLink).toHaveAttribute("href", "/admin/contact-messages");
    });

    it("allows authenticated super_admin to access /admin/contact-messages", async () => {
      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/auth/me`, () => {
          return HttpResponse.json({ data: mockSuperAdminUser });
        }),
      );

      renderAdminInbox();

      expect(await screen.findByText("Contact Messages")).toBeInTheDocument();
      expect(screen.getByText("super_admin")).toBeInTheDocument();
    });

    it("redirects unauthenticated user to /admin/login", async () => {
      authSession.clearSession();
      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/auth/me`, () => {
          return HttpResponse.json(
            { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
            { status: 401 },
          );
        }),
      );

      renderAdminInbox();

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Sign In to CMS/i }),
        ).toBeInTheDocument();
      });
    });
  });

  // --- PART 2: MESSAGE LIST & FIELDS RENDERING ---
  describe("List & Fields Rendering", () => {
    it("renders messages list with sender name, email, subject, preview, timestamp, and newest first order", async () => {
      renderAdminInbox();

      // Default active tab should be Unread since unread messages exist (Diana Krall & Anna Smith)
      await screen.findByText("Diana Krall");
      expect(screen.getByText("Anna Smith")).toBeInTheDocument();

      const filterNav = screen.getByRole("navigation", {
        name: "Message status filter",
      });
      // Click All tab to view all 4 messages
      const allTab = within(filterNav).getByRole("button", { name: /All/i });
      fireEvent.click(allTab);

      // Verify all sender names
      expect(screen.getByText("Diana Krall")).toBeInTheDocument();
      expect(screen.getByText("Anna Smith")).toBeInTheDocument();
      expect(screen.getByText("Bob Jones")).toBeInTheDocument();
      expect(screen.getByText("Charlie Parker")).toBeInTheDocument();

      // Verify emails
      expect(screen.getByText("<diana@example.com>")).toBeInTheDocument();
      expect(screen.getByText("<anna@example.com>")).toBeInTheDocument();
      expect(screen.getByText("<bob@example.com>")).toBeInTheDocument();
      expect(screen.getByText("<charlie@example.com>")).toBeInTheDocument();

      // Verify subjects (including null subject displaying (No subject))
      expect(screen.getByText("Collaboration proposal")).toBeInTheDocument();
      expect(
        screen.getByText("Booking inquiry for festival"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Private masterclass request"),
      ).toBeInTheDocument();
      expect(screen.getByText("(No subject)")).toBeInTheDocument();

      // Verify message previews
      expect(
        screen.getByText(
          "Interested in discussing a collaborative performance project.",
        ),
      ).toBeInTheDocument();

      // Verify ordering: newest first (Diana Krall created 15:00 is first card)
      const listItems = screen.getAllByRole("listitem");
      expect(listItems[0]).toHaveTextContent("Diana Krall");
      expect(listItems[1]).toHaveTextContent("Anna Smith");
      expect(listItems[2]).toHaveTextContent("Bob Jones");
      expect(listItems[3]).toHaveTextContent("Charlie Parker");
    });

    it("displays distinct visual indicators for unread vs read messages (dots and semantic badges)", async () => {
      renderAdminInbox();

      const filterNav = await screen.findByRole("navigation", {
        name: "Message status filter",
      });
      const allTab = within(filterNav).getByRole("button", { name: /All/i });
      fireEvent.click(allTab);

      const list = screen.getByRole("list", { name: "Contact Messages" });

      // Unread messages should have semantic "Unread" badges
      const unreadBadges = within(list).getAllByText("Unread");
      expect(unreadBadges.length).toBe(2); // Diana and Anna

      // Read messages should have semantic "Read" badges
      const readBadges = within(list).getAllByText("Read");
      expect(readBadges.length).toBe(2); // Bob and Charlie
    });

    it("displays all delivery status badges: Sent, Failed, Disabled, Pending", async () => {
      renderAdminInbox();

      const filterNav = await screen.findByRole("navigation", {
        name: "Message status filter",
      });
      const allTab = within(filterNav).getByRole("button", { name: /All/i });
      fireEvent.click(allTab);

      expect(screen.getByText("Pending")).toBeInTheDocument(); // Diana
      expect(screen.getByText("Sent")).toBeInTheDocument(); // Anna
      expect(screen.getByText("Failed")).toBeInTheDocument(); // Bob
      expect(screen.getByText("Disabled")).toBeInTheDocument(); // Charlie
    });

    it("does not dump large email_error text into the list row card", async () => {
      renderAdminInbox();

      const filterNav = await screen.findByRole("navigation", {
        name: "Message status filter",
      });
      const allTab = within(filterNav).getByRole("button", { name: /All/i });
      fireEvent.click(allTab);

      // Verify Bob Jones card does NOT show "SMTP connect error" in list view
      expect(
        screen.queryByText(/SMTP connect error: 554 Transaction failed/i),
      ).not.toBeInTheDocument();
    });
  });

  // --- PART 3: DETAIL MODAL & AUTO-READ ---
  describe("Detail Modal & Auto-Mark Read", () => {
    it("opens unread message, triggers POST /api/v1/admin/contact-messages/:id/read once, and displays all details", async () => {
      let readCallCount = 0;
      let readMessageId: string | null = null;

      server.use(
        http.post(
          `${env.apiBaseUrl}/api/v1/admin/contact-messages/:id/read`,
          ({ params }) => {
            readCallCount++;
            readMessageId = params.id as string;
            return HttpResponse.json({ data: { success: true } });
          },
        ),
      );

      renderAdminInbox();

      // Open unread message Anna Smith
      const annaCard = await screen.findByText("Anna Smith");
      fireEvent.click(annaCard);

      // Modal opens
      const dialog = await screen.findByRole("dialog");
      expect(
        within(dialog).getByRole("heading", { name: "Contact Message" }),
      ).toBeInTheDocument();

      // Assert POST read called exactly once for Anna's ID
      await waitFor(() => {
        expect(readCallCount).toBe(1);
        expect(readMessageId).toBe("aaaaaaaa-0000-4000-8000-000000000001");
      });

      // Assert detail fields inside modal
      expect(within(dialog).getByText("Anna Smith")).toBeInTheDocument();
      expect(
        within(dialog).getByRole("link", { name: "anna@example.com" }),
      ).toHaveAttribute("href", "mailto:anna@example.com");
      expect(
        within(dialog).getByText("Booking inquiry for festival"),
      ).toBeInTheDocument();
      expect(
        within(dialog).getByText(/Email Delivery Status/i),
      ).toBeInTheDocument();
      expect(within(dialog).getByText("Sent")).toBeInTheDocument();
      expect(
        within(dialog).getByText(
          "Hello, we would love to book the ensemble for our summer jazz festival.",
        ),
      ).toBeInTheDocument();

      // Close modal
      const closeBtn = within(dialog).getByRole("button", {
        name: "Close modal",
      });
      fireEvent.click(closeBtn);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("displays sanitized email_error inside detail modal when email delivery status is failed", async () => {
      renderAdminInbox();

      const filterNav = await screen.findByRole("navigation", {
        name: "Message status filter",
      });
      const allTab = within(filterNav).getByRole("button", { name: /^All/i });
      fireEvent.click(allTab);

      // Open Bob Jones (email_status: "failed")
      const bobCard = screen.getByText("Bob Jones");
      fireEvent.click(bobCard);

      const dialog = await screen.findByRole("dialog");

      // Verify email error alert is present inside modal
      expect(within(dialog).getByRole("alert")).toBeInTheDocument();
      expect(
        within(dialog).getByText("SMTP connect error: 554 Transaction failed"),
      ).toBeInTheDocument();
    });

    it("allows user to mark a read message as unread via POST /api/v1/admin/contact-messages/:id/unread", async () => {
      let unreadCallCount = 0;
      let unreadMessageId: string | null = null;

      server.use(
        http.post(
          `${env.apiBaseUrl}/api/v1/admin/contact-messages/:id/unread`,
          ({ params }) => {
            unreadCallCount++;
            unreadMessageId = params.id as string;
            return HttpResponse.json({ data: { success: true } });
          },
        ),
      );

      renderAdminInbox();

      const filterNav = await screen.findByRole("navigation", {
        name: "Message status filter",
      });
      const allTab = within(filterNav).getByRole("button", { name: /^All/i });
      fireEvent.click(allTab);

      // Open Bob Jones (already read)
      const bobCard = screen.getByText("Bob Jones");
      fireEvent.click(bobCard);

      const dialog = await screen.findByRole("dialog");

      // Click "Mark as unread"
      const markUnreadBtn = within(dialog).getByRole("button", {
        name: "Mark as unread",
      });
      fireEvent.click(markUnreadBtn);

      await waitFor(() => {
        expect(unreadCallCount).toBe(1);
        expect(unreadMessageId).toBe("bbbbbbbb-0000-4000-8000-000000000002");
      });

      // Button toggles to "Mark as read"
      expect(
        await within(dialog).findByRole("button", { name: "Mark as read" }),
      ).toBeInTheDocument();
    });
  });

  // --- PART 4: FILTER TABS & EMPTY STATES ---
  describe("Filter Tabs & Empty States", () => {
    it("filters between All, Unread, and Read tabs accurately", async () => {
      renderAdminInbox();

      // Starts on Unread (2 items)
      await screen.findByText("Diana Krall");
      expect(screen.getByText("Anna Smith")).toBeInTheDocument();
      expect(screen.queryByText("Bob Jones")).not.toBeInTheDocument();
      expect(screen.queryByText("Charlie Parker")).not.toBeInTheDocument();

      const filterNav = screen.getByRole("navigation", {
        name: "Message status filter",
      });

      // Switch to Read tab (2 items)
      const readTab = within(filterNav).getByRole("button", { name: /^Read/i });
      fireEvent.click(readTab);

      expect(screen.getByText("Bob Jones")).toBeInTheDocument();
      expect(screen.getByText("Charlie Parker")).toBeInTheDocument();
      expect(screen.queryByText("Diana Krall")).not.toBeInTheDocument();
      expect(screen.queryByText("Anna Smith")).not.toBeInTheDocument();

      // Switch to All tab (4 items)
      const allTab = within(filterNav).getByRole("button", { name: /^All/i });
      fireEvent.click(allTab);

      expect(screen.getByText("Diana Krall")).toBeInTheDocument();
      expect(screen.getByText("Anna Smith")).toBeInTheDocument();
      expect(screen.getByText("Bob Jones")).toBeInTheDocument();
      expect(screen.getByText("Charlie Parker")).toBeInTheDocument();
    });

    it("displays appropriate empty state when a filter has 0 messages", async () => {
      // Mock with only read messages
      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/admin/contact-messages`, () => {
          return HttpResponse.json({
            data: [mockMessages[1]], // Bob Jones (read: true)
          });
        }),
      );

      renderAdminInbox();

      // Since 0 unread messages, default tab is All
      await screen.findByText("Bob Jones");

      const filterNav = screen.getByRole("navigation", {
        name: "Message status filter",
      });

      // Switch to Unread tab
      const unreadTab = within(filterNav).getByRole("button", {
        name: /^Unread/i,
      });
      fireEvent.click(unreadTab);

      expect(screen.getByText("No unread messages.")).toBeInTheDocument();
    });

    it("displays empty state when there are 0 messages in total", async () => {
      server.use(
        http.get(`${env.apiBaseUrl}/api/v1/admin/contact-messages`, () => {
          return HttpResponse.json({ data: [] });
        }),
      );

      renderAdminInbox();

      expect(
        await screen.findByText("No contact messages yet."),
      ).toBeInTheDocument();
    });
  });

  // --- PART 5: AUTH CONTRACT & BEARER TOKEN ---
  describe("API Client & Auth Contract", () => {
    it("attaches Authorization: Bearer token to admin contact messages API calls", async () => {
      let capturedAuth: string | null = null;
      server.use(
        http.get(
          `${env.apiBaseUrl}/api/v1/admin/contact-messages`,
          ({ request }) => {
            capturedAuth = request.headers.get("Authorization");
            return HttpResponse.json({ data: [] });
          },
        ),
      );

      await contactMessagesApi.listMessages();

      expect(capturedAuth).toBe("Bearer mock-access-token");
    });
  });
});
