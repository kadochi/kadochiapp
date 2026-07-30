import "server-only";

import { randomUUID } from "crypto";
import { z } from "zod";
import { wordpressBearerHeaders } from "@/features/auth/services/auth.server";
import { parseUpstreamJson, wordpressFetch } from "@/lib/http/upstream";
import {
  createMagazineCommentInputSchema,
  magazineCommentQuerySchema,
  magazineCommentSubmissionSchema,
  magazineCommentSchema,
  upstreamMagazineCommentsSchema,
} from "../schema/comments";
import { articleText } from "../utils/article-text";

function safeUrl(value: string | undefined) {
  return value && z.string().url().safeParse(value).success ? value : undefined;
}

function mapMagazineComment(comment: z.infer<typeof upstreamMagazineCommentsSchema>[number]) {
  const avatars = comment.author_avatar_urls ?? {};
  return magazineCommentSchema.parse({
    id: comment.id,
    author: articleText(comment.author) || "کاربر",
    avatarUrl: safeUrl(avatars["96"] ?? avatars["48"] ?? Object.values(avatars)[0]),
    createdAt: comment.date_created,
    content: articleText(comment.content),
  });
}

/** Lists approved reader comments for a published magazine article. */
export async function listMagazineComments(query: unknown) {
  const input = magazineCommentQuerySchema.parse(query);
  const params = new URLSearchParams({
    postId: String(input.postId),
    page: String(input.page),
    per_page: String(input.perPage),
  });
  const requestId = randomUUID();
  const response = await wordpressFetch(`/wp-json/kadochi/v1/comments?${params}`, {
    requestId,
    cache: "no-store",
  });
  return (await parseUpstreamJson(response, (value) => upstreamMagazineCommentsSchema.parse(value), requestId)).map(mapMagazineComment);
}

/** Creates a pending magazine comment through Kadochi Core. */
export async function createMagazineComment(input: unknown, requestId: string) {
  const comment = createMagazineCommentInputSchema.parse(input);
  const response = await wordpressFetch("/wp-json/kadochi/v1/comments", {
    method: "POST",
    body: JSON.stringify(comment),
    headers: { "Content-Type": "application/json", ...(await wordpressBearerHeaders()) },
    cache: "no-store",
    requestId,
  });
  return parseUpstreamJson(response, (value) => magazineCommentSubmissionSchema.parse(value), requestId);
}
