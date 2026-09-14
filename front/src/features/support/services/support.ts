import { bffJson } from "@/lib/http/browser";
import { claimResultSchema, createConversationSchema, currentConversationSchema, markReadSchema, sendMessageSchema, supportMessagePageSchema, supportMessageSchema, unreadResultSchema } from "../schema/support";

export function getCurrentConversation(signal?: AbortSignal) { return bffJson("/api/support/conversations/current", { method: "GET", signal }, (value) => currentConversationSchema.parse(value)); }
export function createConversation(input: { displayName: string; phone?: string | null; startNew?: boolean }) { return bffJson("/api/support/conversations", { method: "POST", body: JSON.stringify(createConversationSchema.parse(input)) }, (value) => currentConversationSchema.parse(value)); }
export function claimGuestConversation() { return bffJson("/api/support/claim", { method: "POST" }, (value) => claimResultSchema.parse(value)); }
export function getConversation(id: string, signal?: AbortSignal) { return bffJson(`/api/support/conversations/${id}`, { method: "GET", signal }, (value) => currentConversationSchema.parse(value)); }
export function listMessages(id: string, query: { before?: string; after?: string; perPage?: number } = {}, signal?: AbortSignal) {
  const params = new URLSearchParams({ perPage: String(query.perPage ?? 30) });
  if (query.before) params.set("before", query.before); if (query.after) params.set("after", query.after);
  return bffJson(`/api/support/conversations/${id}/messages?${params}`, { method: "GET", signal }, (value) => supportMessagePageSchema.parse(value));
}
export function sendMessage(id: string, input: { body: string; operationId: string }) { return bffJson(`/api/support/conversations/${id}/messages`, { method: "POST", body: JSON.stringify(sendMessageSchema.parse(input)) }, (value) => supportMessageSchema.parse(value)); }
export function markRead(id: string, throughMessageId: string) { return bffJson(`/api/support/conversations/${id}/read`, { method: "POST", body: JSON.stringify(markReadSchema.parse({ throughMessageId })) }, (value) => unreadResultSchema.parse(value)); }

