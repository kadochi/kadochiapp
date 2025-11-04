// src/app/(front)/products/page.tsx
import "server-only";
import Link from "next/link";
import { cache } from "react";
import type { Metadata } from "next";
import { listProducts } from "@/domains/catalog/services/woo.server";
import Breadcrumb from "@/components/ui/Breadcrumb/Breadcrumb";
import Divider from "@/components/ui/Divider/Divider";
import SectionHeader from "@/components/layout/SectionHeader/SectionHeader";
import AllFiltersSheet from "./sheets/AllFiltersSheet.client";
import CategoriesSheet from "./sheets/CategoriesSheet.client";
import SortSheet from "./sheets/SortSheet.client";
import PriceSheet from "./sheets/PriceSheet.client";
import OccasionsSheet from "./sheets/OccasionsSheet.client";
import FiltersBar from "./sheets/FiltersBar.client";
import ProductListClient from "@/domains/catalog/components/ProductList/ProductList.client";
import s from "./products.module.css";

type Search = {
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

type WPCategory = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
};
type WPTag = { id: number; name: string; description?: string | null };

const WP_BASE =
  process.env.WP_BASE_URL ||
  process.env.NEXT_PUBLIC_WP_BASE_URL ||
  "https://app.kadochi.com";

const getCategoryMeta = cache(async (input: string) => {
  const isId = /^\d+$/.test(input);
  const url = isId
    ? `${WP_BASE}/wp-json/wp/v2/product_cat/${input}`
    : `${WP_BASE}/wp-json/wp/v2/product_cat?slug=${encodeURIComponent(
        input
      )}&per_page=1`;
  try {
    const r = await fetch(url, { next: { revalidate: 300 } });
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

const getTagMeta = cache(async (input: string) => {
  const isId = /^\d+$/.test(input);
  const url = isId
    ? `${WP_BASE}/wp-json/wp/v2/product_tag/${input}`
    : `${WP_BASE}/wp-json/wp/v2/product_tag?slug=${encodeURIComponent(
        input
      )}&per_page=1`;
  try {
    const r = await fetch(url, { next: { revalidate: 300 } });
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

async function getAllCategoriesSSR() {
  const r = await fetch(
    `${WP_BASE}/wp-json/wp/v2/product_cat?per_page=100&_fields=id,name,slug`,
    { next: { revalidate: 600 } }
  );
  if (!r.ok) return [];
  const arr = (await r.json()) as Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  return arr.map((c) => ({ label: c.name, value: String(c.id) }));
}

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 300;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Search>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const categoryParam = sp.category?.trim();
  const tagParam = sp.tag?.trim();

  let metaTitle = "لیست محصولات کادویی";

  if (categoryParam) {
    const cat = await getCategoryMeta(categoryParam);
    if (cat?.name) metaTitle = `لیست کادوهای ${cat.name}`;
  } else if (tagParam) {
    const tag = await getTagMeta(tagParam);
    if (tag?.name) metaTitle = `لیست کادوهای ${tag.name}`;
  }

  return {
    title: metaTitle,
    openGraph: { title: metaTitle },
    twitter: { title: metaTitle },
  };
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const perPage = 12;
  const order = (sp.order ?? "desc") as "asc" | "desc";
  const orderby = (sp.orderby ?? "date") as
    | "date"
    | "price"
    | "popularity"
    | "rating";
  const q = sp.q?.trim() || undefined;
  const categoryParam = sp.category?.trim();
  const tagParam = sp.tag?.trim();
  const minPrice = sp.min_price?.trim();
  const maxPrice = sp.max_price?.trim();

  const categoriesSSR = await getAllCategoriesSSR();

  const catMeta = categoryParam ? await getCategoryMeta(categoryParam) : null;
  const tagMeta = !catMeta && tagParam ? await getTagMeta(tagParam) : null;

  let title = "لیست محصولات کادویی";
  let subtitle = "انواع محصولات مناسب برای هدیه و کادو";
  if (catMeta) {
    title = `لیست کادوهای ${catMeta.name}`;
    subtitle =
      catMeta.description || "انواع هدایا و کادوهای مرتبط با این دسته‌بندی";
  } else if (tagMeta) {
    title = `لیست کادوهای ${tagMeta.name}`;
    subtitle = tagMeta.description || "محصولات کادویی مرتبط با این تگ";
  }

  const { items } = await listProducts({
    page,
    perPage,
    search: q,
    category: categoryParam,
    tag: tagParam,
    order,
    orderby,
    min_price: minPrice,
    max_price: maxPrice,
  } as any);

  const clientKey = (() => {
    const usp = new URLSearchParams();
    if (q) usp.set("q", q);
    if (categoryParam) usp.set("category", categoryParam);
    if (tagParam) usp.set("tag", tagParam);
    if (minPrice) usp.set("min_price", minPrice);
    if (maxPrice) usp.set("max_price", maxPrice);
    usp.set("order", order);
    usp.set("orderby", orderby);
    usp.set("per_page", String(perPage));
    return usp.toString();
  })();

  const baseParams = {
    ...(q ? { q } : {}),
    ...(categoryParam ? { category: categoryParam } : {}),
    ...(tagParam ? { tag: tagParam } : {}),
    ...(minPrice ? { min_price: minPrice } : {}),
    ...(maxPrice ? { max_price: maxPrice } : {}),
    order,
    orderby,
    page: "1",
    per_page: String(perPage),
  };

  const crumbs = [
    { label: "خانه", href: "/" },
    { label: "محصولات کادویی", href: "/products" },
  ] as Array<{ label: string; href?: string }>;
  if (catMeta && categoryParam) {
    crumbs.push({
      label: catMeta.name,
      href: `/products?category=${encodeURIComponent(categoryParam)}`,
    });
  } else if (tagMeta && tagParam) {
    crumbs.push({
      label: tagMeta.name,
      href: `/products?tag=${encodeURIComponent(tagParam)}`,
    });
  }

  return (
    <main dir="rtl">
      <div className="plp">
        <div className={s.filterBar}>
          <FiltersBar categoryLabel={catMeta?.name ?? undefined} />
        </div>

        <Divider />
        <Breadcrumb items={crumbs} />
        <Divider />

        <div className={s.content}>
          <SectionHeader
            title={<span className={s.gradientTitle}>{title}</span>}
            subtitle={subtitle}
            as="h2"
          />

          <ProductListClient
            key={clientKey}
            initialItems={items}
            baseParams={baseParams}
          />
        </div>
      </div>
      <AllFiltersSheet
        isOpen={(sp.sheet ?? "") === "filters"}
        categories={categoriesSSR}
      />
      <CategoriesSheet
        isOpen={(sp.sheet ?? "") === "categories"}
        categories={categoriesSSR}
        title="دسته‌بندی"
      />
      <SortSheet isOpen={(sp.sheet ?? "") === "sort"} />
      <PriceSheet isOpen={(sp.sheet ?? "") === "price"} />
      <OccasionsSheet isOpen={(sp.sheet ?? "") === "occasions"} />
    </main>
  );
}
