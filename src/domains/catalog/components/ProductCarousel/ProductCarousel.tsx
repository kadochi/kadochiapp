// Server Component
import ProductCarouselClient from "./ProductCarousel.client";
import { inferInStock } from "@/domains/catalog/utils/stock";

const WP_BASE = process.env.WP_BASE_URL || "https://app.kadochi.com";

type StoreProduct = {
  id: number;
  name: string;
  images?: { id: number; src: string; alt?: string }[];
  prices?: {
    price?: string;
    sale_price?: string;
    regular_price?: string;
    currency_minor_unit?: number;
  };
  is_in_stock?: boolean;
  is_purchasable?: boolean;
  stock_status?: "instock" | "outofstock" | "onbackorder" | string;
};

type Product = {
  id: number | string;
  image: string;
  title: string;
  price: number | string | null;
  previousPrice?: number | string | null;
  offPercent?: number | null;
  inStock?: boolean;
  href?: string;
};

function mapProducts(arr: StoreProduct[]): Product[] {
  return (arr || [])
    .filter(Boolean)
    .map((p) => {
      const sale = Number(p.prices?.sale_price ?? NaN);
      const regular = Number(p.prices?.regular_price ?? NaN);
      const base = Number(
        p.prices?.sale_price ?? p.prices?.price ?? p.prices?.regular_price ?? 0
      );

      const inStock = inferInStock(p);

      let prev: number | null = null;
      let off: number | null = null;
      if (
        inStock &&
        Number.isFinite(sale) &&
        Number.isFinite(regular) &&
        regular > sale
      ) {
        prev = regular;
        off = Math.max(0, Math.round(((regular - sale) / regular) * 100));
      }

      return {
        id: p.id,
        image: p.images?.[0]?.src || "/images/placeholder.png",
        title: p.name || "",
        price: inStock ? base : null,
        previousPrice: inStock ? prev : null,
        offPercent: inStock ? off : null,
        inStock,
        href: `/product/${p.id}`,
      };
    })
    .filter((p) => p.id != null && String(p.title).trim().length > 0);
}

async function fetchFromWP(
  params?: Record<string, string | number | boolean | undefined>
) {
  const qs = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null) qs.set(k, String(v));
  });
  if (!qs.has("per_page")) qs.set("per_page", "8");

  const url = `${WP_BASE}/wp-json/wc/store/v1/products?${qs.toString()}`;

  try {
    const r = await fetch(url, { next: { revalidate: 60 } });
    if (!r.ok) return [];
    const json = await r.json();
    return Array.isArray(json) ? json : [];
  } catch {
    return [];
  }
}

export default async function ProductCarousel({
  items,
  filter,
  endpoint = "/api/products?per_page=8",
  wpParams,
  productIds,
}: {
  items?: Product[];
  filter?: (p: Product) => boolean;
  endpoint?: string;
  wpParams?: Record<string, string | number | boolean | undefined>;
  productIds?: Array<number | string>;
}) {
  if (items?.length) {
    return (
      <ProductCarouselClient
        items={items}
        filter={filter}
        endpoint={endpoint}
        wpParams={wpParams}
        productIds={productIds}
      />
    );
  }

  if (productIds?.length) {
    const numericIds = productIds
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n) && n > 0);

    const promises = numericIds.map((id) =>
      fetch(`${WP_BASE}/wp-json/wc/store/v1/products/${id}`, {
        next: { revalidate: 60 },
      })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)
    );
    const singles = (await Promise.all(promises)).filter(
      Boolean
    ) as StoreProduct[];
    const mapped = mapProducts(singles);
    const finalItems = filter ? mapped.filter(filter) : mapped;
    return (
      <ProductCarouselClient
        items={finalItems}
        filter={filter}
        endpoint={endpoint}
        wpParams={wpParams}
        productIds={productIds}
      />
    );
  }

  const raw = await fetchFromWP(wpParams);
  const mapped = mapProducts(raw);
  const finalItems = filter ? mapped.filter(filter) : mapped;

  return (
    <ProductCarouselClient
      items={finalItems}
      filter={filter}
      endpoint={endpoint}
      wpParams={wpParams}
      productIds={productIds}
    />
  );
}
