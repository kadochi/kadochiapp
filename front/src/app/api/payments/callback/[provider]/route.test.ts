import { beforeEach, describe, expect, it, vi } from "vitest";

const callbacks = vi.hoisted(() => ({ parse: vi.fn(), reconcile: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/features/payment/callbacks.server", () => ({ parsePaymentCallback: callbacks.parse }));
vi.mock("@/features/payment/payment.server", () => ({ reconcilePaymentCallback: callbacks.reconcile }));
vi.mock("@/lib/http/route", () => ({ requestId: () => "request-1" }));

import { GET, POST } from "./route";
import { paymentProviderById } from "@/features/payment/providers";

const provider = paymentProviderById("zarinpal")!;

describe("GET /api/payments/callback/[provider]", () => {
  beforeEach(() => {
    callbacks.parse.mockReset().mockReturnValue({ provider, orderId: 42, hintState: "pending", relayQuery: new URLSearchParams() });
    callbacks.reconcile.mockReset();
  });

  it("rejects unsupported providers", async () => {
    const response = await GET(new Request("https://shop.test/api/payments/callback/unknown"), { params: Promise.resolve({ provider: "unknown" }) });
    expect(response.status).toBe(404);
  });

  it("rejects non-GET callback methods", async () => {
    const response = await POST(new Request("https://shop.test/api/payments/callback/zarinpal", { method: "POST" }));
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET");
  });

  it.each([
    ["paid", "/checkout/success?order=42"],
    ["failed", "/checkout/failure?order=42&state=failed"],
    ["cancelled", "/checkout/failure?order=42&state=cancelled"],
    ["pending", "/checkout/return?order=42&state=pending"],
    ["unknown", "/checkout/return?order=42&state=unknown"],
  ])("redirects %s through the normalized result path", async (state, path) => {
    callbacks.reconcile.mockResolvedValue(state);

    const response = await GET(new Request("https://shop.test/api/payments/callback/zarinpal"), { params: Promise.resolve({ provider: "zarinpal" }) });

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(path);
  });

  it("renders generic failure when callback validation rejects input", async () => {
    callbacks.parse.mockImplementation(() => { throw new Error("invalid callback"); });

    const response = await GET(new Request("https://shop.test/api/payments/callback/zarinpal?Authority=secret"), { params: Promise.resolve({ provider: "zarinpal" }) });

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/checkout/failure?state=failed");
  });
});
