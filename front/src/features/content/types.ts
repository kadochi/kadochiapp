import type { z } from "zod";
import type { homepageContentSchema } from "./schema/content";
export type HomepageContent = z.infer<typeof homepageContentSchema>;
