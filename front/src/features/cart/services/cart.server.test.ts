import { beforeEach, describe, expect, it, vi } from "vitest";

const transport = vi.hoisted(() => ({ fetch: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => name === "kadochi_cart_token" ? { value: "cart-token" } : undefined }),
}));
vi.mock("@/lib/http/upstream", () => ({
  wordpressFetch: transport.fetch,
  parseUpstreamJson: async (response: Response, parse: (value: unknown) => unknown) => parse(await response.json()),
}));

import { clearCart } from "./cart.server";

describe("clearCart", () => {
  beforeEach(() => transport.fetch.mockReset());

  it("empties the current tokenized cart, including its applied coupons", async () => {
    transport.fetch.mockResolvedValue(new Response(JSON.stringify([]), {
      status: 200,
      headers: { "Cart-Token": "cleared-cart-token" },
    }));

    await expect(clearCart("request-1")).resolves.toEqual({ cartToken: "cleared-cart-token" });
    expect(transport.fetch).toHaveBeenCalledWith("/wp-json/wc/store/v1/cart/items", {
      method: "DELETE",
      headers: { "Cart-Token": "cart-token" },
      cache: "no-store",
      requestId: "request-1",
    });
  });
});
