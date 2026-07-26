import { beforeEach, describe, expect, it, vi } from "vitest";

import { ServiceError } from "@/lib/http/errors";

const mocks = vi.hoisted(() => ({
  clearAuthToken: vi.fn(),
  getCurrentCustomer: vi.fn(),
  getStoredAuthToken: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/features/auth/services/auth.server", () => ({
  clearAuthToken: mocks.clearAuthToken,
  getCurrentCustomer: mocks.getCurrentCustomer,
  getStoredAuthToken: mocks.getStoredAuthToken,
}));

import { GET } from "./route";

describe("GET /api/auth/current", () => {
  beforeEach(() => {
    mocks.clearAuthToken.mockReset();
    mocks.getCurrentCustomer.mockReset();
    mocks.getStoredAuthToken.mockReset();
  });

  it("normalizes an anonymous session to a cache-safe 200/null response", async () => {
    mocks.getStoredAuthToken.mockResolvedValue(undefined);
    mocks.getCurrentCustomer.mockRejectedValue(
      new ServiceError({
        code: "unauthenticated",
        status: 401,
        message: "Authentication is required.",
        requestId: "auth-test",
        retryable: false,
      }),
    );

    const response = await GET(
      new Request("https://kadochi.example/api/auth/current", {
        headers: { "x-request-id": "auth-test" },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toBeNull();
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.clearAuthToken).toHaveBeenCalledWith(response);
  });
});
