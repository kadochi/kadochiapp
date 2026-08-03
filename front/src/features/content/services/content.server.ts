import "server-only";

import { randomUUID } from "crypto";
import { parseUpstreamJson, wordpressFetch } from "@/lib/http/upstream";
import { homepageContentSchema } from "../schema/content";
import { mapHeroPosts } from "../utils/hero-posts";

/** Normalized editorial data from the intentional Kadochi API. */
export async function getHomepageContent() {
  const requestId = randomUUID();
  const response = await wordpressFetch("/wp-json/kadochi/v1/content/home", {
    requestId,
    timeoutMs: 20_000,
    next: { revalidate: 60, tags: ["homepage-content"] },
  });
  return parseUpstreamJson(response, (value) => homepageContentSchema.parse(value), requestId);
}

/** Reads published Hero posts directly from SCF's WordPress REST representation. */
export async function getHeroSlides() {
  const requestId = randomUUID();
  const response = await wordpressFetch("/wp-json/wp/v2/hero?acf_format=standard&per_page=50&orderby=date&order=asc", {
    requestId,
    timeoutMs: 20_000,
    next: { revalidate: 60, tags: ["homepage-content"] },
  });
  return parseUpstreamJson(response, mapHeroPosts, requestId);
}
