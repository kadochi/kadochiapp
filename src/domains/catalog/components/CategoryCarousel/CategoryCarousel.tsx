import CategoryCarouselClient from "./CategoryCarouselClient";

type WCCategory = {
  id: number;
  name: string;
  slug: string;
  description?: string;
  image?: { id: number; src: string; alt?: string } | null;
};

type Card = {
  id: number;
  title: string;
  href: string;
  subtitle?: string;
  image?: string;
};

const WP_BASE =
  process.env.WP_BASE_URL ||
  process.env.NEXT_PUBLIC_WP_BASE_URL ||
  "https://app.kadochi.com";

function isUncategorized(c: Pick<WCCategory, "slug" | "name">) {
  const n = (c.name || "").trim();
  const s = (c.slug || "").trim().toLowerCase();
  return s === "uncategorized" || n === "بدون دسته‌بندی";
}

async function fetchCategories(): Promise<Card[]> {
  const url = `${WP_BASE}/wp-json/wc/store/v1/products/categories?per_page=50`;
  try {
    const r = await fetch(url, { next: { revalidate: 300 } });
    if (!r.ok) return [];

    const json = (await r.json()) as unknown;
    if (!Array.isArray(json)) return [];

    return (json as WCCategory[])
      .filter(
        (c) =>
          c && c.id && (c.name ?? "").trim().length > 0 && !isUncategorized(c)
      )
      .map((c) => ({
        id: c.id,
        title: c.name ?? "",
        href: `/products?category=${encodeURIComponent(c.slug)}`,
        subtitle: (c.description ?? "").trim() || undefined,
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
