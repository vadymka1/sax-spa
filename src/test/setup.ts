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
