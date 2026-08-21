import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "./msw/server";
import { mediaApi } from "../api/mediaApi";
import { apiClient } from "../api/client";
import { env } from "../lib/env";

describe("Media API Upload Multipart Regression", () => {
  const originalAdapter = apiClient.defaults.adapter;

  beforeEach(() => {
    // Select Axios built-in fetch adapter for native transport execution
    apiClient.defaults.adapter = "fetch";
  });

  afterEach(() => {
    // Restore original Axios adapter to isolate transport changes
    apiClient.defaults.adapter = originalAdapter;
  });

  it("uploads media as browser-generated multipart FormData with boundary and file entry", async () => {
    let handlerCalled = false;

    server.use(
      http.post(
        `${env.apiBaseUrl}/api/v1/admin/media/upload`,
        async ({ request }) => {
          handlerCalled = true;

          // 1. Verify HTTP method
          expect(request.method).toBe("POST");

          // 2. Verify exact upload endpoint
          const url = new URL(request.url);
          expect(url.pathname).toBe("/api/v1/admin/media/upload");

          // 3. Require multipart Content-Type and dynamic boundary
          const contentType = request.headers.get("content-type") ?? "";
          expect(contentType).toContain("multipart/form-data");
          expect(contentType).toContain("boundary=");

          // 4. Verify no explicit boundary-less header was manually set
          expect(contentType).not.toBe("multipart/form-data");

          // 5. Parse intercepted request body natively as FormData
          const formData = await request.formData();

          // 6. Assert file field exists
          const uploadedFile = formData.get("file");
          expect(uploadedFile).not.toBeNull();

          // 7. Assert file entry is binary/file-like (not a string)
          if (typeof uploadedFile === "string") {
            throw new Error("Expected multipart file entry, received string");
          }

          // 8. Assert filename, MIME type, and non-empty payload
          if (uploadedFile && typeof uploadedFile === "object") {
            expect(uploadedFile.name).toBe("test-upload.png");
            expect(uploadedFile.type).toBe("image/png");
            expect(uploadedFile.size).toBeGreaterThan(0);
          }

          // 9. Return valid backend-shaped AdminMedia DTO
          return HttpResponse.json({
            data: {
              type: "image",
              id: "99887766-5544-3322-1100-aabbccddeeff",
              url: `${env.apiBaseUrl}/uploads/images/test-upload.png`,
              original_filename: "test-upload.png",
              mime_type: "image/png",
              file_size: 1024,
              created_at: new Date().toISOString(),
            },
          });
        },
      ),
    );

    const file = new File(["test-image-content"], "test-upload.png", {
      type: "image/png",
    });

    const result = await mediaApi.uploadMedia(file);

    expect(handlerCalled).toBe(true);
    expect(result.type).toBe("image");
    if (result.type === "image") {
      expect(result.id).toBe("99887766-5544-3322-1100-aabbccddeeff");
      expect(result.url).toBe(
        `${env.apiBaseUrl}/uploads/images/test-upload.png`,
      );
      expect(result.original_filename).toBe("test-upload.png");
      expect(result.mime_type).toBe("image/png");
    }
  });
});
