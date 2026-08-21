import { describe, it, expect } from "vitest";
import { resolveEnv } from "../lib/env";

describe("Environment Validation", () => {
  it("throws clear error when VITE_API_BASE_URL is missing", () => {
    expect(() => resolveEnv({})).toThrow(
      "VITE_API_BASE_URL environment variable is required",
    );
  });

  it("throws clear error when VITE_API_BASE_URL is whitespace-only", () => {
    expect(() => resolveEnv({ VITE_API_BASE_URL: "   " })).toThrow(
      "VITE_API_BASE_URL environment variable is required",
    );
  });

  it("normalizes trailing slashes correctly", () => {
    const singleSlash = resolveEnv({
      VITE_API_BASE_URL: "http://localhost:8000/",
    });
    expect(singleSlash.apiBaseUrl).toBe("http://localhost:8000");

    const multiSlash = resolveEnv({
      VITE_API_BASE_URL: "http://localhost:8000////",
    });
    expect(multiSlash.apiBaseUrl).toBe("http://localhost:8000");
  });

  it("throws clear error when VITE_API_BASE_URL is not a valid URL", () => {
    expect(() => resolveEnv({ VITE_API_BASE_URL: "not-a-url" })).toThrow(
      "Invalid VITE_API_BASE_URL format: not-a-url",
    );
  });

  it("throws clear error when protocol is not http or https", () => {
    expect(() =>
      resolveEnv({ VITE_API_BASE_URL: "ftp://example.com" }),
    ).toThrow("Invalid VITE_API_BASE_URL protocol: ftp:");
  });

  it("accepts valid http and https URLs", () => {
    const httpResult = resolveEnv({
      VITE_API_BASE_URL: "http://localhost:8000",
    });
    expect(httpResult.apiBaseUrl).toBe("http://localhost:8000");

    const httpsResult = resolveEnv({
      VITE_API_BASE_URL: "https://api.example.com",
    });
    expect(httpsResult.apiBaseUrl).toBe("https://api.example.com");
  });
});
