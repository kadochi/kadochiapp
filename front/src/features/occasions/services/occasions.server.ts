import "server-only";

import { parseUpstreamJson, wordpressFetch } from "@/lib/http/upstream";
import { requireConfiguredIdentity } from "@/lib/server/env";
import { occasionListSchema, occasionSchema } from "../schema/occasions";

type OccasionsAction = { method: "GET" | "POST" | "PATCH" | "DELETE"; path: string; cookie: string; body?: unknown; response: "list" | "item" };
export async function executeOccasions(action: OccasionsAction, requestId: string) {
  requireConfiguredIdentity();
  const response = await wordpressFetch(action.path, { method: action.method, body: action.body ? JSON.stringify(action.body) : undefined, headers: { ...(action.cookie ? { Cookie: action.cookie } : {}), ...(action.body ? { "Content-Type": "application/json" } : {}) }, cache: "no-store", requestId });
  return parseUpstreamJson(response, (value) => action.response === "list" ? occasionListSchema.parse(value) : occasionSchema.parse(value), requestId);
}
