import { z } from "zod";
export const customerSchema = z.object({ id: z.number().int().positive(), email: z.string().email(), displayName: z.string(), roles: z.array(z.string()) });
