import { bffJson } from "@/lib/http/browser";
import { createOccasionSchema, deleteOccasionSchema, occasionListQuerySchema, occasionListSchema, occasionSchema, updateOccasionSchema } from "../schema/occasions";
import type { CreateOccasionInput, OccasionListQuery, UpdateOccasionInput } from "../types";

export function listOccasions(query: OccasionListQuery = {}) { const input = occasionListQuerySchema.parse(query); return bffJson(`/api/occasions?${new URLSearchParams({ page: String(input.page), perPage: String(input.perPage) })}`, { method: "GET" }, (value) => occasionListSchema.parse(value)); }
export const getOccasion = (id: number) => bffJson(`/api/occasions/${id}`, { method: "GET" }, (value) => occasionSchema.parse(value));
export const createOccasion = (input: CreateOccasionInput) => bffJson("/api/occasions", { method: "POST", body: JSON.stringify(createOccasionSchema.parse(input)) }, (value) => occasionSchema.parse(value));
export const updateOccasion = (id: number, patch: Omit<UpdateOccasionInput, "version">, version: string) => bffJson(`/api/occasions/${id}`, { method: "PATCH", body: JSON.stringify(updateOccasionSchema.parse({ ...patch, version })) }, (value) => occasionSchema.parse(value));
export const deleteOccasion = (id: number, version: string) => bffJson(`/api/occasions/${id}`, { method: "DELETE", body: JSON.stringify(deleteOccasionSchema.parse({ version })) }, (value) => occasionSchema.parse(value));
