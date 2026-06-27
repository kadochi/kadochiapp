import "server-only";
import { cache } from "react";
import { wordpressFetch } from "@/services/wordpress";

export type Search = {
  q?: string;
  page?: string;
  order?: "asc" | "desc";
  orderby?: "date" | "price" | "popularity" | "rating";
  category?: string;
  tag?: string;
  sheet?: string;
  min_price?: string;
  max_price?: string;
};

export type WPCategory = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
};
export type WPTag = { id: number; name: string; description?: string | null };

export function stripHtml(input?: string | null) {
  if (!input) return "";
  return input
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const getCategoryMeta = cache(async (input: string) => {
  const isId = /^\d+$/.test(input);
  const path = isId
    ? `/wp-json/wp/v2/product_cat/${input}`
    : `/wp-json/wp/v2/product_cat?slug=${encodeURIComponent(input)}&per_page=1`;
  try {
    const r = await wordpressFetch(path, { revalidate: 300 });
    if (!r.ok) return null;
    const js = isId ? await r.json() : (await r.json())?.[0];
    return js
      ? ({
          id: js.id,
          name: js.name,
          description: js.description ?? null,
        } as WPCategory)
      : null;
  } catch {
    return null;
  }
});

export const getTagMeta = cache(async (input: string) => {
  const isId = /^\d+$/.test(input);
  const path = isId
    ? `/wp-json/wp/v2/product_tag/${input}`
    : `/wp-json/wp/v2/product_tag?slug=${encodeURIComponent(input)}&per_page=1`;
  try {
    const r = await wordpressFetch(path, { revalidate: 300 });
    if (!r.ok) return null;
    const js = isId ? await r.json() : (await r.json())?.[0];
    return js
      ? ({
          id: js.id,
          name: js.name,
          description: js.description ?? null,
        } as WPTag)
      : null;
  } catch {
    return null;
  }
});

export async function getAllCategoriesSSR() {
  const r = await wordpressFetch(
    "/wp-json/wp/v2/product_cat?per_page=100&_fields=id,name,slug",
    { revalidate: 600 },
  );
  if (!r.ok) return [];
  const arr = (await r.json()) as Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  return arr.map((c) => ({ label: c.name, value: String(c.id) }));
}
