import "server-only";

import { randomUUID } from "crypto";
import { z } from "zod";
import { parseUpstreamJson, wordpressFetch } from "@/lib/http/upstream";
import { wordpressMediaUrl } from "@/lib/server/wordpress-media";
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
  return parseUpstreamJson(response, (value) => {
    const content = homepageContentSchema.parse(value);
    const image = <T extends { url: string; alt: string } | null>(value: T): T => value ? { ...value, url: wordpressMediaUrl(value.url) } : value;
    return {
      ...content,
      banners: content.banners.map((item) => ({ ...item, backgroundImage: image(item.backgroundImage) })),
      heroes: content.heroes.map((item) => ({ ...item, backgroundImage: image(item.backgroundImage) })),
      sliders: content.sliders.map((item) => ({ ...item, backgroundImage: image(item.backgroundImage) })),
      stories: content.stories.map((item) => ({ ...item, image: image(item.image) })),
    };
  }, requestId);
}

/** Records a story after its image has successfully loaded in the viewer. */
export async function recordStoryView(storyId: number, requestId: string): Promise<void> {
  const id = z.coerce.number().int().positive().parse(storyId);
  const response = await wordpressFetch("/wp-json/kadochi/v1/story-views", {
    method: "POST",
    body: JSON.stringify({ storyId: id }),
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    requestId,
  });
  await parseUpstreamJson(response, (value) => z.object({ views: z.number().int().nonnegative() }).parse(value), requestId);
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
