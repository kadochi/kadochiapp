import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { paymentProviderById } from "./providers";
import { parsePaymentCallback } from "./callbacks.server";

const zarinpal = paymentProviderById("zarinpal")!;

describe("parsePaymentCallback", () => {
  it("forwards only a strict successful ZarinPal callback allow-list", () => {
    const callback = parsePaymentCallback(zarinpal, new URLSearchParams({
      wc_order: "42",
      Status: "OK",
      Authority: "a1b2c3d4e5f6g7h8",
    }));

    expect(callback.orderId).toBe(42);
    expect(callback.hintState).toBe("pending");
    expect(callback.relayQuery.toString()).toBe("wc_order=42&Status=OK&Authority=a1b2c3d4e5f6g7h8");
  });

  it("allows cancellation without an authority", () => {
    const callback = parsePaymentCallback(zarinpal, new URLSearchParams({ wc_order: "42", Status: "NOK" }));

    expect(callback.hintState).toBe("cancelled");
    expect(callback.relayQuery.toString()).toBe("wc_order=42&Status=NOK");
  });

  it("relays a cancellation even when its authority is malformed", () => {
    const callback = parsePaymentCallback(zarinpal, new URLSearchParams({ wc_order: "42", Status: "NOK", Authority: "bad!" }));

    expect(callback.hintState).toBe("cancelled");
    expect(callback.relayQuery.toString()).toBe("wc_order=42&Status=NOK");
  });

  it.each([
    new URLSearchParams({ wc_order: "0", Status: "OK", Authority: "a1b2c3d4e5f6g7h8" }),
    new URLSearchParams({ wc_order: "42", Status: "OK" }),
    new URLSearchParams("wc_order=42&Status=OK&Authority=a1b2c3d4e5f6g7h8&Authority=duplicate-authority"),
    new URLSearchParams({ wc_order: "42", Status: "OK", Authority: "a1b2c3d4e5f6g7h8", next: "https://attacker.test" }),
  ])("rejects malformed or extra input", (params) => {
    expect(() => parsePaymentCallback(zarinpal, params)).toThrow();
  });
});
