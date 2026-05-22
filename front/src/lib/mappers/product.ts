// src/lib/mappers/product.ts

export type StoreProduct = {
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

export type Product = {
  id: number | string;
  image: string;
  title: string;
  price: number;
  previousPrice?: number | null;
  offPercent?: number | null;
  inStock?: boolean;
};

export function inferInStock(p: Partial<StoreProduct>): boolean {
  const st = String(p?.stock_status || "").toLowerCase();
  if (st === "outofstock") return false;
  if (p?.is_in_stock === false) return false;
  if (p?.is_purchasable === false) return false;
  return true;
}

/** Normalize price numbers + discount fields (single point of truth) */
export function mapStoreProduct(p: StoreProduct): Product {
  const price = Number(
    p.prices?.sale_price ?? p.prices?.price ?? p.prices?.regular_price ?? 0
  );
  const prevRaw =
    p.prices?.regular_price && Number(p.prices?.regular_price) > price
      ? Number(p.prices?.regular_price)
      : null;

  const offPercent =
    prevRaw && prevRaw > 0
      ? Math.round(((prevRaw - price) / prevRaw) * 100)
      : null;

  return {
    id: p.id,
    image: p.images?.[0]?.src || "/images/placeholder.png",
    title: p.name || "",
    price,
    previousPrice: prevRaw,
    offPercent,
    inStock: inferInStock(p),
  };
}

export function mapStoreProducts(arr: StoreProduct[]): Product[] {
  return (arr || [])
    .filter(Boolean)
    .map(mapStoreProduct)
    .filter((x) => x.id != null && String(x.title).trim().length > 0);
}
