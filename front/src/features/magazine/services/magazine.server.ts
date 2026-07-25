import "server-only";

import { randomUUID } from "crypto";
import { z } from "zod";
import { ServiceError } from "@/lib/http/errors";
import { parseUpstreamJson, wordpressFetch } from "@/lib/http/upstream";
import { magazineArticleSchema, magazineQuerySchema, upstreamMagazineCategoriesSchema, upstreamMagazinesSchema } from "../schema/magazine";
import type { MagazineArticle, MagazineCategory, MagazineListResult, MagazineQuery } from "../types";
import { articleText, readingTime } from "../utils/article-text";

function magazineParams(query: MagazineQuery): string {
  const input = magazineQuerySchema.parse(query);
  const params = new URLSearchParams({
    _embed: "1",
    order: "desc",
    orderby: "date",
    page: String(input.page),
    per_page: String(input.perPage),
  });
  if (input.category) params.set("categories", String(input.category));
  if (input.exclude?.length) params.set("exclude", input.exclude.join(","));
  return params.toString();
}

function mapMagazineArticle(upstream: z.infer<typeof upstreamMagazinesSchema>[number]): MagazineArticle {
  const media = upstream._embedded?.["wp:featuredmedia"]?.[0];
  const sizes = media?.media_details?.sizes;
  const imageUrl = sizes?.large?.source_url ?? sizes?.medium_large?.source_url ?? media?.source_url;
  const terms = upstream._embedded?.["wp:term"]?.flat() ?? [];
  const categories = terms
    .filter((term) => term.taxonomy === "category")
    .map(({ id, name, slug }) => ({ id, name: articleText(name), slug }));
  const content = upstream.content.rendered;

  return magazineArticleSchema.parse({
    id: upstream.id,
    title: articleText(upstream.title.rendered),
    slug: upstream.slug,
    excerpt: articleText(upstream.excerpt.rendered) || articleText(content).slice(0, 180),
    content,
    publishedAt: upstream.date,
    modifiedAt: upstream.modified,
    authorName: upstream._embedded?.author?.[0]?.name || "تحریریه کادوچی",
    image: imageUrl ? { url: imageUrl, alt: media?.alt_text || articleText(upstream.title.rendered) } : undefined,
    categories,
    readingTime: readingTime(content),
  });
}

type MagazineEndpointResult = {
  articles: MagazineArticle[];
  total: number;
};

async function listMagazineEndpoint(
  postType: "magazine" | "posts",
  query: MagazineQuery,
): Promise<MagazineEndpointResult> {
  const requestId = randomUUID();
  const response = await wordpressFetch(`/wp-json/wp/v2/${postType}?${magazineParams(query)}`, {
    // Existing sites may not have received the Magazine content-type update
    // yet; standard WordPress posts remain a valid editorial source.
    acceptStatuses: [404],
    cache: "no-store",
    requestId,
  });
  if (response.status === 404) return { articles: [], total: 0 };

  const articles = (await parseUpstreamJson(response, (value) => upstreamMagazinesSchema.parse(value), requestId)).map(mapMagazineArticle);
  const total = Number(response.headers.get("x-wp-total"));
  return {
    articles,
    total: Number.isSafeInteger(total) && total >= 0 ? total : articles.length,
  };
}

/**
 * Fetches both the dedicated Magazine type and normal WordPress posts. This
 * keeps previously published blog posts visible while editors transition to
 * the dedicated Magazine editor.
 */
export async function listMagazineArticles(query: MagazineQuery = {}): Promise<MagazineListResult> {
  const input = magazineQuerySchema.parse(query);
  const [magazine, posts] = await Promise.all([
    listMagazineEndpoint("magazine", input),
    listMagazineEndpoint("posts", input),
  ]);
  const articles = [...magazine.articles, ...posts.articles]
    .sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt))
    .slice(0, input.perPage);
  const total = magazine.total + posts.total;
  return {
    items: articles,
    page: input.page,
    perPage: input.perPage,
    total,
    totalPages: total ? Math.ceil(total / input.perPage) : 0,
  };
}

async function getMagazineArticleFromEndpoint(postType: "magazine" | "posts", slug: string): Promise<MagazineArticle | undefined> {
  const requestId = randomUUID();
  const params = new URLSearchParams({ _embed: "1", slug, per_page: "1" });
  const response = await wordpressFetch(`/wp-json/wp/v2/${postType}?${params}`, {
    acceptStatuses: [404],
    cache: "no-store",
    requestId,
  });
  if (response.status === 404) return undefined;
  return (await parseUpstreamJson(response, (value) => upstreamMagazinesSchema.parse(value), requestId))
    .map(mapMagazineArticle)
    .find((item) => item.slug === slug);
}

export async function getMagazineArticleBySlug(slug: string): Promise<MagazineArticle> {
  const safeSlug = z.string().trim().min(1).max(200).parse(slug);
  const requestId = randomUUID();
  const [magazine, post] = await Promise.all([
    getMagazineArticleFromEndpoint("magazine", safeSlug),
    getMagazineArticleFromEndpoint("posts", safeSlug),
  ]);
  const article = magazine ?? post;
  if (!article) {
    throw new ServiceError({ code: "not_found", status: 404, message: "Magazine article not found.", requestId, retryable: false });
  }
  return article;
}

/** Looks up a WordPress category before listing only its Magazine articles. */
export async function getMagazineCategoryBySlug(slug: string): Promise<MagazineCategory | null> {
  const safeSlug = z.string().trim().min(1).max(200).parse(slug);
  const requestId = randomUUID();
  const response = await wordpressFetch(`/wp-json/wp/v2/categories?slug=${encodeURIComponent(safeSlug)}&per_page=1`, {
    requestId,
    next: { revalidate: 300, tags: ["magazine-categories"] },
  });
  const category = (await parseUpstreamJson(response, (value) => upstreamMagazineCategoriesSchema.parse(value), requestId))[0];
  return category ? { id: category.id, name: articleText(category.name), slug: category.slug } : null;
}
