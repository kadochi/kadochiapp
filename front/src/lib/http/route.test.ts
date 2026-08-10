import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { requestId } from "./route";

describe("requestId", () => {
  it("uses only the alphabet preserved by the WordPress correlation-id parser", () => {
    const request = new Request("https://kadochi.test", {
      headers: { "x-request-id": " edge /request%=123:42 ? " },
    });

    expect(requestId(request)).toBe("edgerequest123:42");
  });

  it("generates an id when the forwarded value has no safe characters", () => {
    vi.stubGlobal("crypto", { randomUUID: () => "generated-id" });

    expect(requestId(new Request("https://kadochi.test", {
      headers: { "x-request-id": " /%= " },
    }))).toBe("generated-id");

    vi.unstubAllGlobals();
  });
});
