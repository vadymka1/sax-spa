import { http, HttpResponse } from "msw";
import { validPublicPageResponse } from "../fixtures/publicPageFixture";

export const handlers = [
  http.get("http://localhost:8000/api/v1/public/page", ({ request }) => {
    const url = new URL(request.url);
    const locale = url.searchParams.get("locale");
    if (locale === "de") {
      return HttpResponse.json({
        data: {
          ...validPublicPageResponse.data,
          sections: [
            {
              ...validPublicPageResponse.data.sections[0],
              title: "Über uns",
              navigation_label: "Über uns",
              blocks: [
                {
                  ...validPublicPageResponse.data.sections[0]!.blocks[0]!,
                  title: "Wer wir sind",
                  text: "Das SPA Saxophon-Ensemble bietet erstklassige musikalische Darbietungen.",
                },
                ...validPublicPageResponse.data.sections[0]!.blocks.slice(1),
              ],
            },
          ],
        },
      });
    }
    return HttpResponse.json(validPublicPageResponse);
  }),
  http.get("http://localhost:8000/api/v1/auth/me", () => {
    return HttpResponse.json({
      data: {
        id: "default-admin-id",
        email: "admin@example.test",
        display_name: "Admin User",
        role: "admin",
        is_active: true,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    });
  }),
  http.post("http://localhost:8000/api/v1/admin/media/upload", () => {
    return HttpResponse.json({
      data: {
        type: "image",
        id: "99887766-5544-3322-1100-aabbccddeeff",
        url: "/uploads/test.jpg",
        original_filename: "test.jpg",
        mime_type: "image/jpeg",
        file_size: 1024,
        created_at: new Date().toISOString(),
      },
    });
  }),
  http.post("http://localhost:8000/api/v1/public/contact", () => {
    return HttpResponse.json({
      data: {
        success: true,
        message: "Message sent successfully",
      },
    });
  }),
  http.get("http://localhost:8000/api/v1/admin/contact-messages", () => {
    return HttpResponse.json({
      data: [],
    });
  }),
  http.post("http://localhost:8000/api/v1/auth/refresh", () => {
    return HttpResponse.json(
      { error: { code: "UNAUTHORIZED", message: "No refresh session" } },
      { status: 401 },
    );
  }),
  http.post("http://localhost:8000/api/v1/auth/logout", () => {
    return HttpResponse.json({
      data: { message: "Successfully logged out" },
    });
  }),
];
