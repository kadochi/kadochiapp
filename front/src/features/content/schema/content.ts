import { z } from "zod";

const imageSchema = z.object({ url: z.string().url(), alt: z.string() }).nullable();
export const homepageContentSchema = z.object({
  banners: z.array(z.object({ id: z.number().int().positive(), title: z.string(), subtitle: z.string(), ctaText: z.string(), ctaLink: z.string().url().nullable(), backgroundGradient: z.string().nullable(), backgroundImage: imageSchema })),
  heroes: z.array(z.object({ id: z.number().int().positive(), title: z.string(), subtitle: z.string().default(""), ctaText: z.string(), ctaLink: z.string().url().nullable(), backgroundImage: imageSchema })),
  sliders: z.array(z.object({ id: z.number().int().positive(), sliderTitle: z.string(), sliderButtonText: z.string(), sliderLink: z.string().url().nullable(), backgroundImage: imageSchema })),
});
