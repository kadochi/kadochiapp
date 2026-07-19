import type { z } from "zod";

import type {
  profileOrderDetailSchema,
  profileOrderItemSchema,
  profileOrderListSchema,
  profileOrderSchema,
  updateProfileSchema,
} from "./schema/profile";

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ProfileOrderItem = z.infer<typeof profileOrderItemSchema>;
export type ProfileOrder = z.infer<typeof profileOrderSchema>;
export type ProfileOrderList = z.infer<typeof profileOrderListSchema>;
export type ProfileOrderDetail = z.infer<typeof profileOrderDetailSchema>;
