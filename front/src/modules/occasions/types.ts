import type { z } from "zod";
import type {
  occasionResponseSchema,
  occasionAcfSchema,
} from "./schema";

export type WPOccasion = z.infer<typeof occasionResponseSchema>;
export type WPOccasionAcf = z.infer<typeof occasionAcfSchema>;

export type OccasionEntry = {
  title: string;
  variant: "public" | "private";
  id?: number;
};

export type OccasionItem = {
  title: string;
  day: string;
  month: string;
  remainingDays: number;
  sortKey: number;
  variant: "public" | "private";
};
