import "@testing-library/jest-dom";
import { beforeAll, afterEach, afterAll } from "vitest";
import { server } from "./msw/server";
import { setAccessTokenProvider, setRefreshHandler } from "../api/client";
import { authSession } from "../features/auth/authSession";

beforeAll(() => {
  setAccessTokenProvider(() => authSession.getAccessToken());
  setRefreshHandler(() => authSession.getOrStartRefresh());
  server.listen({ onUnhandledRequest: "error" });
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
if (typeof window !== "undefined") {
  if (typeof window.URL.createObjectURL === "undefined") {
    Object.defineProperty(window.URL, "createObjectURL", {
      value: (blob: Blob) => `blob:mock-${blob.size || "file"}`,
      writable: true,
    });
  }
  if (typeof window.URL.revokeObjectURL === "undefined") {
    Object.defineProperty(window.URL, "revokeObjectURL", {
      value: () => {},
      writable: true,
    });
  }
}
