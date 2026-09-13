import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { ContactForm } from "../features/public-page/ContactForm";
import { server } from "./msw/server";

describe("ContactForm Component", () => {
  it("renders all form elements properly", () => {
    render(<ContactForm />);

    expect(
      screen.getByRole("heading", { name: "Get in Touch" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Subject/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Message/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Send Message" }),
    ).toBeInTheDocument();
  });

  it("validates required fields client-side and suppresses network calls when invalid", async () => {
    let postCalls = 0;
    server.use(
      http.post("http://localhost:8000/api/v1/public/contact", () => {
        postCalls++;
        return HttpResponse.json({ data: { success: true } });
      }),
    );

    render(<ContactForm />);

    const submitBtn = screen.getByRole("button", { name: "Send Message" });
    fireEvent.click(submitBtn);

    expect(await screen.findByText("Name is required.")).toBeInTheDocument();
    expect(screen.getByText("Email is required.")).toBeInTheDocument();
    expect(screen.getByText("Message is required.")).toBeInTheDocument();
    expect(postCalls).toBe(0);

    // Test invalid email
    fireEvent.change(screen.getByLabelText(/Name/), {
      target: { value: "Miles Davis" },
    });
    fireEvent.change(screen.getByLabelText(/Email/), {
      target: { value: "invalid-email" },
    });
    fireEvent.change(screen.getByLabelText(/Message/), {
      target: { value: "Valid message content here." },
    });
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText("Please enter a valid email address."),
    ).toBeInTheDocument();
    expect(postCalls).toBe(0);

    // Test message length < 10
    fireEvent.change(screen.getByLabelText(/Email/), {
      target: { value: "miles@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Message/), {
      target: { value: "Short" },
    });
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText("Message must be at least 10 characters long."),
    ).toBeInTheDocument();
    expect(postCalls).toBe(0);
  });

  it("successfully submits form, displays success feedback, and allows resetting", async () => {
    let capturedPayload: unknown = null;
    server.use(
      http.post(
        "http://localhost:8000/api/v1/public/contact",
        async ({ request }) => {
          capturedPayload = await request.json();
          return HttpResponse.json({ data: { success: true } });
        },
      ),
    );

    render(<ContactForm />);

    fireEvent.change(screen.getByLabelText(/Name/), {
      target: { value: "John Coltrane" },
    });
    fireEvent.change(screen.getByLabelText(/Email/), {
      target: { value: "coltrane@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Subject/), {
      target: { value: "Booking Inquiry" },
    });
    fireEvent.change(screen.getByLabelText(/Message/), {
      target: {
        value: "Hello, we would love to book a performance for next spring.",
      },
    });

    const submitBtn = screen.getByRole("button", { name: "Send Message" });
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText(/Your message has been sent successfully/),
    ).toBeInTheDocument();

    expect(capturedPayload).toEqual({
      name: "John Coltrane",
      email: "coltrane@example.com",
      subject: "Booking Inquiry",
      message: "Hello, we would love to book a performance for next spring.",
    });

    // Reset back to form
    const resetBtn = screen.getByRole("button", {
      name: "Send another message",
    });
    fireEvent.click(resetBtn);

    expect(
      screen.getByRole("button", { name: "Send Message" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Name/)).toHaveValue("");
  });

  it("displays server error message and request ID when submission fails", async () => {
    server.use(
      http.post("http://localhost:8000/api/v1/public/contact", () => {
        return HttpResponse.json(
          {
            error: {
              code: "RATE_LIMITED",
              message: "Too many messages sent. Please wait.",
              request_id: "req-test-999",
            },
          },
          { status: 429 },
        );
      }),
    );

    render(<ContactForm />);

    fireEvent.change(screen.getByLabelText(/Name/), {
      target: { value: "Art Blakey" },
    });
    fireEvent.change(screen.getByLabelText(/Email/), {
      target: { value: "art@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Message/), {
      target: { value: "Message about festival lineup coordination." },
    });

    fireEvent.click(screen.getByRole("button", { name: "Send Message" }));

    expect(
      await screen.findByText("Too many messages sent. Please wait."),
    ).toBeInTheDocument();
    expect(screen.getByText("Request ID: req-test-999")).toBeInTheDocument();
  });

  it("ensures public contact requests do NOT send Bearer token and 401 never triggers /auth/refresh", async () => {
    let authHeader: string | null = null;
    let refreshCalls = 0;

    server.use(
      http.post(
        "http://localhost:8000/api/v1/public/contact",
        ({ request }) => {
          authHeader = request.headers.get("Authorization");
          return HttpResponse.json(
            {
              error: {
                code: "UNAUTHORIZED",
                message: "Public endpoint test 401",
                request_id: "req-auth-001",
              },
            },
            { status: 401 },
          );
        },
      ),
      http.post("http://localhost:8000/api/v1/auth/refresh", () => {
        refreshCalls++;
        return HttpResponse.json({ data: {} });
      }),
    );

    render(<ContactForm />);

    fireEvent.change(screen.getByLabelText(/Name/), {
      target: { value: "Sonny Rollins" },
    });
    fireEvent.change(screen.getByLabelText(/Email/), {
      target: { value: "sonny@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Message/), {
      target: { value: "Testing auth isolation on contact endpoint." },
    });

    fireEvent.click(screen.getByRole("button", { name: "Send Message" }));

    await waitFor(() => {
      expect(screen.getByText("Public endpoint test 401")).toBeInTheDocument();
    });

    // Zero Bearer auth attached
    expect(authHeader).toBeNull();

    // Zero refresh attempts triggered
    expect(refreshCalls).toBe(0);
  });

  it("ensures submit button is visible by default, has correct classes, and remains visible while submitting", async () => {
    let resolveSubmit: (value: unknown) => void;
    const submitPromise = new Promise((resolve) => {
      resolveSubmit = resolve;
    });

    server.use(
      http.post("http://localhost:8000/api/v1/public/contact", async () => {
        await submitPromise;
        return HttpResponse.json({ data: { success: true } });
      }),
    );

    render(<ContactForm />);

    const submitBtn = screen.getByRole("button", { name: "Send Message" });
    // Button exists, is visible in default normal state, and enabled
    expect(submitBtn).toBeInTheDocument();
    expect(submitBtn).toBeVisible();
    expect(submitBtn).toBeEnabled();
    expect(submitBtn.className).toMatch(/submitButton/);

    // Fill valid form
    fireEvent.change(screen.getByLabelText(/Name/), {
      target: { value: "Wayne Shorter" },
    });
    fireEvent.change(screen.getByLabelText(/Email/), {
      target: { value: "wayne@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Message/), {
      target: { value: "Looking forward to hearing the quartet perform live." },
    });

    // Click submit
    fireEvent.click(submitBtn);

    // Button transitions to submitting state: visibly disabled with loading text
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Sending..." })).toBeDisabled();
    });
    const sendingBtn = screen.getByRole("button", { name: "Sending..." });
    expect(sendingBtn).toBeVisible();
    expect(sendingBtn.className).toMatch(/submitButton/);

    // Resolve submission
    resolveSubmit!({ success: true });

    // Success state reached
    expect(
      await screen.findByText(/Your message has been sent successfully/),
    ).toBeInTheDocument();

    // Reset via "Send another message" restores visible button
    const resetBtn = screen.getByRole("button", {
      name: "Send another message",
    });
    expect(resetBtn).toBeVisible();
    expect(resetBtn.className).toMatch(/sendAnotherButton/);
    fireEvent.click(resetBtn);

    const restoredBtn = screen.getByRole("button", { name: "Send Message" });
    expect(restoredBtn).toBeVisible();
    expect(restoredBtn).toBeEnabled();
  });
});
