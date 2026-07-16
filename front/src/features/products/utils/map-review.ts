import { z } from "zod";
import { productReviewSchema, upstreamReviewsSchema } from "../schema/products";
import { stripHtml } from "./strip-html";

type UpstreamReview = z.infer<typeof upstreamReviewsSchema>[number];

function safeUrl(value: string | undefined) {
  if (!value) return undefined;
  return z.string().url().safeParse(value).success ? value : undefined;
}

export function mapReview(review: UpstreamReview) {
  const avatars = review.reviewer_avatar_urls ?? {};
  return productReviewSchema.parse({
    id: review.id,
    author: review.reviewer.trim() || "کاربر",
    avatarUrl: safeUrl(avatars["96"] ?? avatars["48"] ?? Object.values(avatars)[0]),
    rating: review.rating ?? null,
    createdAt: review.date_created,
    content: stripHtml(review.review),
    verified: review.verified,
  });
}
