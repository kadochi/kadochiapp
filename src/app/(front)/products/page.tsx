import "server-only";
import { cache } from "react";
import type { Metadata } from "next";
import { listProducts } from "@/lib/api/woo";
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
import Header from "@/components/layout/Header/Header";

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

const SITE_BASE =
  (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "") ||
  WP_BASE.replace(/\/$/, "");

/* ---- helpers ---- */

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

function stripHtml(input?: string | null) {
  if (!input) return "";
  return input
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

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
  const q = sp.q?.trim() || "";
  const page = Math.max(1, Number(sp.page ?? 1) || 1);

  let metaTitle = "لیست محصولات کادویی";
  let metaDescription =
    "لیست محصولات کادویی؛ انواع هدایا و کادوهای مناسب برای مناسبت‌های مختلف، با امکان فیلتر بر اساس قیمت، دسته‌بندی و مناسبت.";

  if (categoryParam) {
    const cat = await getCategoryMeta(categoryParam);
    if (cat?.name) {
      metaTitle = `لیست کادوهای ${cat.name}`;
      const desc = stripHtml(cat.description);
      if (desc) {
        metaDescription = desc.slice(0, 155);
      } else {
        metaDescription = `خرید کادو و هدیه در دسته‌بندی ${cat.name} با امکان ارسال و فیلتر بر اساس قیمت و مناسبت.`;
      }
    }
  } else if (tagParam) {
    const tag = await getTagMeta(tagParam);
    if (tag?.name) {
      metaTitle = `لیست کادوهای ${tag.name}`;
      const desc = stripHtml(tag.description);
      if (desc) {
        metaDescription = desc.slice(0, 155);
      } else {
        metaDescription = `خرید هدیه و کادو برای ${tag.name} با ارسال سریع و امکان فیلتر محصولات.`;
      }
    }
  } else if (q) {
    metaTitle = `جستجو برای "${q}" در کادوچی`;
    metaDescription = `نتایج جستجو برای "${q}" در فروشگاه کادوچی؛ لیست محصولات کادویی مرتبط با جستجوی شما.`;
  }

  const usp = new URLSearchParams();
  if (categoryParam) usp.set("category", categoryParam);
  if (tagParam) usp.set("tag", tagParam);
  if (q) usp.set("q", q);
  if (page > 1) usp.set("page", String(page));
  const canonicalPath =
    "/products" + (usp.toString() ? `?${usp.toString()}` : "");

  return {
    title: metaTitle,
    description: metaDescription,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title: metaTitle,
      description: metaDescription,
      url: canonicalPath,
    },
    twitter: {
      title: metaTitle,
      description: metaDescription,
    },
  };
}

function normalizeForClient(items: any[]) {
  const toNum = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const isPriceObj = (v: any): v is { amount: number; currency: string } =>
    v && typeof v === "object" && "amount" in v && "currency" in v;

  return (items || []).map((p) => {
    const images =
      Array.isArray(p?.images) && p.images.length
        ? p.images
            .map((im: any) => ({
              url: im?.url ?? im?.src ?? "",
              alt: im?.alt ?? p?.name ?? "",
            }))
            .filter((im: any) => im.url)
        : [];

    const currency =
      (isPriceObj(p?.price) && p.price.currency) || p?.currency || "IRR";

    const toAmount = (val: any): number =>
      isPriceObj(val) ? Number(val.amount || 0) : toNum(val);

    const baseRaw =
      (p?.salePrice !== undefined &&
      p?.salePrice !== null &&
      p?.salePrice !== ""
        ? p.salePrice
        : p?.price !== undefined && p?.price !== null && p?.price !== ""
        ? p.price
        : p?.regularPrice) ?? 0;

    const price = isPriceObj(p?.price)
      ? p.price
      : { amount: toAmount(baseRaw), currency };

    const regularPrice = isPriceObj(p?.regularPrice)
      ? p.regularPrice
      : p?.regularPrice != null && p?.regularPrice !== ""
      ? { amount: toAmount(p.regularPrice), currency }
      : undefined;

    const salePrice = isPriceObj(p?.salePrice)
      ? p.salePrice
      : p?.salePrice != null && p?.salePrice !== ""
      ? { amount: toAmount(p.salePrice), currency }
      : undefined;

    return { ...p, images, price, regularPrice, salePrice };
  });
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

  const categoriesPromise = getAllCategoriesSSR();
  const catMetaPromise = categoryParam
    ? getCategoryMeta(categoryParam)
    : Promise.resolve(null);
  const tagMetaPromise =
    !categoryParam && tagParam ? getTagMeta(tagParam) : Promise.resolve(null);

  const listPromise = listProducts({
    page,
    per_page: perPage,
    search: q,
    category: categoryParam,
    tag: tagParam,
    order,
    orderby,
    min_price: minPrice,
    max_price: maxPrice,
  } as any);

  const [categoriesSSR, catMetaRaw, tagMetaRaw, listResult] = await Promise.all(
    [categoriesPromise, catMetaPromise, tagMetaPromise, listPromise]
  );

  const catMeta = catMetaRaw;
  const tagMeta = !catMeta ? tagMetaRaw : null;

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

  const { items } = listResult;

  const normalizedItems = normalizeForClient(items);

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

  // ----- SEO structured data (no UI change) -----

  const searchForCanonical = new URLSearchParams();
  if (categoryParam) searchForCanonical.set("category", categoryParam);
  if (tagParam) searchForCanonical.set("tag", tagParam);
  if (q) searchForCanonical.set("q", q);
  if (page > 1) searchForCanonical.set("page", String(page));
  const canonicalPath =
    "/products" +
    (searchForCanonical.toString() ? `?${searchForCanonical.toString()}` : "");
  const canonicalUrl = `${SITE_BASE}${canonicalPath}`;

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: c.label,
      ...(c.href ? { item: `${SITE_BASE}${c.href}` } : {}),
    })),
  };

  const itemListLd =
    normalizedItems.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: title,
          itemListOrder: order === "asc" ? "Ascending" : "Descending",
          numberOfItems: normalizedItems.length,
          itemListElement: normalizedItems
            .map((p: any, index: number) => {
              const url =
                p?.permalink ||
                (p?.slug ? `${SITE_BASE}/product/${p.slug}` : null) ||
                (p?.id ? `${SITE_BASE}/product/${p.id}` : null);
              if (!url) return null;

              const firstImage =
                Array.isArray(p.images) && p.images.length
                  ? p.images[0]?.url
                  : undefined;

              return {
                "@type": "ListItem",
                position: (page - 1) * perPage + index + 1,
                item: {
                  "@type": "Product",
                  name: p.name || "",
                  image: firstImage,
                  sku: p.sku || undefined,
                  url,
                  offers: {
                    "@type": "Offer",
                    priceCurrency: p.price?.currency || "IRR",
                    price: String(p.price?.amount ?? 0),
                    availability: "https://schema.org/InStock",
                  },
                },
              };
            })
            .filter(Boolean),
        }
      : null;

  return (
    <main
      dir="rtl"
      itemScope
      itemType="https://schema.org/CollectionPage"
      // semantic only; no visual changes
    >
      {/* JSON-LD for breadcrumbs */}
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {/* JSON-LD for product list (ItemList) */}
      {itemListLd && (
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
        />
      )}

      <div className="plp">
        <Header />
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
            initialItems={normalizedItems}
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
