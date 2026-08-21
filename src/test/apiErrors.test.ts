import { describe, it, expect } from "vitest";
import { AxiosError, AxiosHeaders, AxiosResponse } from "axios";
import { z } from "zod";
import { normalizeApiError } from "../api/errors";

describe("API Error Normalization", () => {
  it("normalizes structured backend API errors and preserves request_id", () => {
    const axiosError = new AxiosError(
      "Request failed with status code 422",
      "ERR_BAD_REQUEST",
      undefined,
      {},
      {
        status: 422,
        statusText: "Unprocessable Entity",
        headers: {},
        config: { headers: new AxiosHeaders() },
        data: {
          error: {
            code: "VALIDATION_ERROR",
            message: "Request validation failed",
            details: [{ field: "email", message: "Email is required" }],
            request_id: "req_1234567890",
          },
        },
      } as AxiosResponse,
    );

    const normalized = normalizeApiError(axiosError);
    expect(normalized.status).toBe(422);
    expect(normalized.code).toBe("VALIDATION_ERROR");
    expect(normalized.message).toBe("Request validation failed");
    expect(normalized.requestId).toBe("req_1234567890");
    expect(normalized.details).toHaveLength(1);
    expect(normalized.details?.[0]?.field).toBe("email");
  });

  it("handles network failure errors gracefully", () => {
    const networkError = new AxiosError(
      "Network Error",
      "ERR_NETWORK",
      undefined,
      {},
    );

    const normalized = normalizeApiError(networkError);
    expect(normalized.code).toBe("NETWORK_ERROR");
    expect(normalized.message).toContain("Could not connect");
  });

  it("handles timeout errors gracefully", () => {
    const timeoutError = new AxiosError(
      "timeout of 10000ms exceeded",
      "ECONNABORTED",
    );

    const normalized = normalizeApiError(timeoutError);
    expect(normalized.code).toBe("TIMEOUT");
    expect(normalized.message).toContain("timed out");
  });

  it("normalizes Zod schema contract failures to safe INVALID_API_RESPONSE error", () => {
    let zodError: unknown;
    try {
      z.object({ type: z.literal("image") }).parse({ type: "video" });
    } catch (err) {
      zodError = err;
    }

    const normalized = normalizeApiError(zodError);
    expect(normalized.code).toBe("INVALID_API_RESPONSE");
    expect(normalized.message).toBe(
      "The server returned an unexpected response.",
    );
    expect(normalized.message).not.toContain("invalid_literal");
    expect(normalized.message).not.toContain("invalid_type");
    expect(normalized.message).not.toContain("ZodError");
  });

  it("handles generic unknown exceptions", () => {
    const genericError = new Error("Random runtime crash");
    const normalized = normalizeApiError(genericError);
    expect(normalized.code).toBe("UNEXPECTED_ERROR");
    expect(normalized.message).toBe("Random runtime crash");
  });
});
