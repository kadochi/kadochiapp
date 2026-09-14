import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/auth/auth-provider", () => ({ useAuth: () => ({ status: "anonymous", customer: null }) }));
vi.mock("../services/support", () => ({}));

import { mergeMessages, SUPPORT_AGENT, SUPPORT_GREETING } from "./support-chat";

const base = { body: "message", senderRole: "customer" as const, createdAt: "2026-09-14T10:00:00Z", readAt: null };

describe("support chat message reconciliation", () => {
  it("deduplicates polling results and keeps chronological order", () => {
    const older = { ...base, id: "123e4567-e89b-42d3-a456-426614174000" };
    const newer = { ...base, id: "123e4567-e89b-42d3-a456-426614174001", createdAt: "2026-09-14T10:01:00Z" };
    expect(mergeMessages([newer], [older, newer]).map((message) => message.id)).toEqual([older.id, newer.id]);
  });
});

describe("support agent identity", () => {
  it("uses one stable name and local avatar", () => {
    expect(SUPPORT_AGENT).toEqual({
      name: "نازنین احمدی",
      avatar: "/images/support-agent-nazanin.png",
    });
  });

  it("uses the Persian launcher greeting", () => {
    expect(SUPPORT_GREETING).toBe("چطور می‌تونم کمکتون کنم؟");
  });
});
