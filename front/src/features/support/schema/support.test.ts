import { describe, expect, it } from "vitest";
import { createConversationSchema, sendMessageSchema, supportConversationSchema, supportMessagePageSchema } from "./support";

const id = "123e4567-e89b-42d3-a456-426614174000";

describe("support contracts", () => {
  it("accepts the public conversation shape without internal WordPress ids", () => {
    const conversation = supportConversationSchema.parse({ id, status: "open", displayName: "مینا", assignedAgent: null, lastMessageAt: null, unreadCount: 0, version: "opaque" });
    expect(conversation.id).toBe(id);
    expect(conversation).not.toHaveProperty("postId");
  });

  it("requires guest names and bounds messages", () => {
    expect(createConversationSchema.safeParse({ displayName: "ا", phone: null }).success).toBe(false);
    expect(sendMessageSchema.safeParse({ body: "", operationId: id }).success).toBe(false);
    expect(sendMessageSchema.safeParse({ body: "x".repeat(2001), operationId: id }).success).toBe(false);
  });

  it("validates opaque pagination cursors and both sender roles", () => {
    const page = supportMessagePageSchema.parse({ items: [{ id, senderRole: "administrator", body: "پاسخ", createdAt: "2026-09-14T10:00:00Z", readAt: null }], hasMore: false, oldestCursor: id, newestCursor: id });
    expect(page.items[0].senderRole).toBe("administrator");
  });
});
