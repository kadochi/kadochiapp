import type { z } from "zod";
import type { supportConversationSchema, supportMessagePageSchema, supportMessageSchema, supportStatusSchema } from "./schema/support";

export type SupportStatus = z.infer<typeof supportStatusSchema>;
export type SupportConversation = z.infer<typeof supportConversationSchema>;
export type SupportMessage = z.infer<typeof supportMessageSchema>;
export type SupportMessagePage = z.infer<typeof supportMessagePageSchema>;

