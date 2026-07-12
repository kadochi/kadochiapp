import type { z } from "zod";
import type { customerSchema } from "./schema/auth";
export type Customer = z.infer<typeof customerSchema>;
