import CategoryCarouselClient from "./CategoryCarouselClient";
import { fetchStoreCategories } from "../../services/categories";
import type { StoreCategory } from "../../types";

type Card = {
  id: number;
  title: string;
  href: string;
  subtitle?: string;
  image?: string;
};

function isUncategorized(c: Pick<StoreCategory, "slug" | "name">) {
  const n = (c.name || "").trim();
  const s = (c.slug || "").trim().toLowerCase();
  return s === "uncategorized" || n === "بدون دسته\u200Cبندی";
}

async function fetchCategories(): Promise<Card[]> {
  try {
    const json = await fetchStoreCategories({ per_page: 50, hide_empty: true });
    return (json as StoreCategory[])
      .filter((c) => c && c.id && (c.name ?? "").trim().length > 0 && !isUncategorized(c))
      .map((c) => ({
        id: c.id,
        title: c.name ?? "",
        href: `/products?category=${encodeURIComponent(c.slug)}`,
        subtitle: undefined,
        image: c.image?.src || undefined,
      }));
  } catch {
    return [];
  }
}

export default async function CategoryCarousel() {
  const items = await fetchCategories();
  return <CategoryCarouselClient items={items} />;
}
