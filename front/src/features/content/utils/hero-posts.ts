import { z } from "zod";
import { wordpressMediaUrl } from "@/lib/server/wordpress-media";

export const heroSlideSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1),
  subtitle: z.string(),
  ctaText: z.string(),
  ctaLink: z.string().url().nullable(),
  backgroundImage: z.string().url(),
});

export const heroSlideListSchema = z.array(heroSlideSchema);

export type HeroSlide = z.infer<typeof heroSlideSchema>;

const rawHeroPostSchema = z.object({
  id: z.number().int().positive(),
  acf: z.record(z.string(), z.unknown()),
});

const urlSchema = z.string().url();

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function url(value: unknown): string | undefined {
  const parsed = urlSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

function imageUrl(value: unknown): string | undefined {
  if (typeof value === "string") return url(value);
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  return url((value as { url?: unknown }).url);
}

/**
 * Maps the legacy SCF REST representation to the app's stable hero contract.
 * Invalid posts are ignored so one bad editorial record cannot hide valid ones.
 */
export function mapHeroPosts(value: unknown): HeroSlide[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((record) => {
    const parsed = rawHeroPostSchema.safeParse(record);
    if (!parsed.success) return [];

    const title = text(parsed.data.acf.title);
    const backgroundImage = imageUrl(parsed.data.acf.background_image);
    if (!title || !backgroundImage) return [];

    return [{
      id: parsed.data.id,
      title,
      subtitle: text(parsed.data.acf.subtitle),
      ctaText: text(parsed.data.acf.cta_text),
      ctaLink: url(parsed.data.acf.cta_link) ?? null,
      backgroundImage: wordpressMediaUrl(backgroundImage),
    }];
  });
}
