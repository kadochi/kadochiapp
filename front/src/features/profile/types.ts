import type { z } from "zod";

import type {
  profileOrderDetailSchema,
  profileOrderItemSchema,
  profileOrderListSchema,
  profileOrderSchema,
  profileProductActionSchema,
  profileProductListSchema,
  personalProfileSchema,
  publicPersonalProfileSchema,
  updatePersonalProfileSchema,
  updateProfileSchema,
} from "./schema/profile";

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ProfileOrderItem = z.infer<typeof profileOrderItemSchema>;
export type ProfileOrder = z.infer<typeof profileOrderSchema>;
export type ProfileOrderList = z.infer<typeof profileOrderListSchema>;
export type ProfileOrderDetail = z.infer<typeof profileOrderDetailSchema>;
export type ProfileProductAction = z.infer<typeof profileProductActionSchema>;
export type ProfileProductList = z.infer<typeof profileProductListSchema>;
export type PersonalProfile = z.infer<typeof personalProfileSchema>;
export type UpdatePersonalProfileInput = z.infer<typeof updatePersonalProfileSchema>;
export type PublicPersonalProfile = z.infer<typeof publicPersonalProfileSchema>;
