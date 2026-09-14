import { z } from "zod";

const uuid = z.string().uuid();
const nullableDate = z.string().datetime().nullable();

export const supportStatusSchema = z.enum(["open", "pending", "closed"]);
export const supportConversationSchema = z.object({
  id: uuid,
  status: supportStatusSchema,
  displayName: z.string().min(1),
  assignedAgent: z.string().nullable(),
  lastMessageAt: nullableDate,
  unreadCount: z.number().int().nonnegative(),
  version: z.string().min(1),
}).strict();

export const currentConversationSchema = z.object({ conversation: supportConversationSchema.nullable() }).strict();
export const supportMessageSchema = z.object({
  id: uuid,
  senderRole: z.enum(["customer", "administrator"]),
  body: z.string(),
  createdAt: z.string().datetime(),
  readAt: nullableDate,
}).strict();
export const supportMessagePageSchema = z.object({
  items: z.array(supportMessageSchema),
  hasMore: z.boolean(),
  oldestCursor: uuid.nullable(),
  newestCursor: uuid.nullable(),
}).strict();
export const createConversationSchema = z.object({
  displayName: z.string().trim().min(2, "نام باید حداقل ۲ نویسه باشد.").max(100),
  phone: z.string().trim().max(30).nullable().optional(),
  startNew: z.boolean().optional(),
}).strict();
export const sendMessageSchema = z.object({ body: z.string().trim().min(1).max(2000), operationId: uuid }).strict();
export const markReadSchema = z.object({ throughMessageId: uuid }).strict();
export const unreadResultSchema = z.object({ unreadCount: z.number().int().nonnegative() }).strict();
export const claimResultSchema = currentConversationSchema.extend({ claimed: z.boolean().optional() }).strict();

