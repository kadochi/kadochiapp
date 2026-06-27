import "server-only";
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
import {
  getAllCategoriesSSR,
  getCategoryMeta,
  getTagMeta,
  stripHtml,
  type Search,
} from "./products.data";
import {
  buildBreadcrumbLd,
  buildItemListLd,
  normalizeForClient,
  type Crumb,
} from "./products.helpers";

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
      metaTitle = `خرید کادو ${cat.name}`;
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
      metaTitle = `خرید کادو برای ${tag.name}`;
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
    [categoriesPromise, catMetaPromise, tagMetaPromise, listPromise],
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

  const crumbs: Crumb[] = [
    { label: "خانه", href: "/" },
    { label: "محصولات کادویی", href: "/products" },
  ];
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
  const breadcrumbLd = buildBreadcrumbLd(crumbs);
  const itemListLd = buildItemListLd({
    normalizedItems,
    title,
    order,
    page,
    perPage,
  });

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
