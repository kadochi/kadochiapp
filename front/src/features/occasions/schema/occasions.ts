import { z } from "zod";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => { const [year, month, day] = value.split("-").map(Number); return new Date(Date.UTC(year, month - 1, day)).getUTCFullYear() === year && new Date(Date.UTC(year, month - 1, day)).getUTCMonth() === month - 1 && new Date(Date.UTC(year, month - 1, day)).getUTCDate() === day; }, "Occasion date must be a real YYYY-MM-DD date.");
const title = z.string().trim().min(1).max(120);
export const occasionSchema = z.object({ id: z.number().int().positive(), title, occasionDate: dateOnly, version: z.string().min(1).max(64) });
export const occasionListQuerySchema = z.object({ page: z.coerce.number().int().positive().max(100).default(1), perPage: z.coerce.number().int().positive().max(50).default(20) });
export const createOccasionSchema = z.object({ title, occasionDate: dateOnly }).strict();
export const updateOccasionSchema = z.object({ title: title.optional(), occasionDate: dateOnly.optional(), version: z.string().min(1).max(64) }).strict().refine((input) => input.title !== undefined || input.occasionDate !== undefined, "At least one occasion field must be updated.");
export const deleteOccasionSchema = z.object({ version: z.string().min(1).max(64) }).strict();
export const occasionListSchema = z.object({ items: z.array(occasionSchema), page: z.number().int().positive(), perPage: z.number().int().positive(), total: z.number().int().nonnegative(), totalPages: z.number().int().nonnegative() });
