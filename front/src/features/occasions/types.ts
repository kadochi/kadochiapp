import type { z } from "zod";
import type { createOccasionSchema, occasionListQuerySchema, occasionListSchema, occasionSchema, updateOccasionSchema } from "./schema/occasions";
export type Occasion = z.infer<typeof occasionSchema>;
export type OccasionList = z.infer<typeof occasionListSchema>;
export type OccasionListQuery = z.input<typeof occasionListQuerySchema>;
export type CreateOccasionInput = z.input<typeof createOccasionSchema>;
export type UpdateOccasionInput = z.input<typeof updateOccasionSchema>;
