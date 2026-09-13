import { beforeEach, describe, expect, it, vi } from "vitest";

const transport = vi.hoisted(() => ({ fetch: vi.fn(), discard: vi.fn(), parse: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/http/upstream", () => ({
  wordpressFetch: transport.fetch,
  discardUpstreamResponse: transport.discard,
  parseUpstreamJson: transport.parse,
}));

import { reconcilePaymentCallback } from "./payment.server";
import { paymentProviderById } from "./providers";

const provider = paymentProviderById("zarinpal")!;
const callback = {
  provider,
  orderId: 42,
  hintState: "pending" as const,
  relayQuery: new URLSearchParams({ wc_order: "42", Status: "OK", Authority: "a1b2c3d4e5f6g7h8" }),
};

describe("reconcilePaymentCallback", () => {
  beforeEach(() => {
    transport.fetch.mockReset();
    transport.discard.mockReset();
    transport.parse.mockReset();
  });

  it("uses a manual relay even when WordPress responds with a malicious redirect", async () => {
    transport.fetch
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { Location: "https://attacker.test/steal" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ orderId: 42, provider: "zarinpal", state: "paid" })));
    transport.discard.mockResolvedValue(undefined);
    transport.parse.mockImplementation(async (response: Response, parse: (value: unknown) => unknown) => parse(await response.json()));

    await expect(reconcilePaymentCallback(callback, "request-1")).resolves.toBe("paid");
    expect(transport.fetch.mock.calls[0]?.[0]).toContain("wc-api=WC_ZPal");
    expect(transport.fetch.mock.calls[0]?.[1]).toMatchObject({ redirect: "manual", acceptStatuses: [301, 302, 303, 307, 308] });
    expect(transport.fetch.mock.calls[1]?.[0]).toBe("/wp-json/kadochi/v1/internal/payments/orders/42/state?provider=zarinpal");
  });

  it("returns unknown after a relay network failure when the authoritative state remains pending", async () => {
    transport.fetch
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(new Response(JSON.stringify({ orderId: 42, provider: "zarinpal", state: "pending" })));
    transport.parse.mockImplementation(async (response: Response, parse: (value: unknown) => unknown) => parse(await response.json()));

    await expect(reconcilePaymentCallback(callback, "request-1")).resolves.toBe("unknown");
  });

  it("returns unknown when the state reconciliation times out", async () => {
    transport.fetch
      .mockResolvedValueOnce(new Response(null, { status: 302 }))
      .mockRejectedValueOnce(new Error("timeout"));
    transport.discard.mockResolvedValue(undefined);

    await expect(reconcilePaymentCallback(callback, "request-1")).resolves.toBe("unknown");
  });
});
