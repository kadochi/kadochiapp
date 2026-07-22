import "server-only";

import { randomUUID } from "crypto";
import { parseUpstreamJson, wordpressFetch } from "@/lib/http/upstream";
import { homepageContentSchema } from "../schema/content";

/** Normalized editorial data from the intentional Kadochi API. */
export async function getHomepageContent() {
  const requestId = randomUUID();
  const response = await wordpressFetch("/wp-json/kadochi/v1/content/home", { cache: "no-store", requestId });
  return parseUpstreamJson(response, (value) => homepageContentSchema.parse(value), requestId);
}
