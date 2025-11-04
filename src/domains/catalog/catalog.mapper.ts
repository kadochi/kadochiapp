// Map raw WooCommerce product into our domain Product
import type { WooProduct } from "@/types/woo";
import type {
  Product,
  MediaImage,
  Category,
  Attribute,
} from "./models/product";
import { irrToIrt, parseAmount, pickCurrency, toPrice } from "./utils/price";
import { mapWooStockStatus } from "./utils/stock";
import { stripHtml } from "./utils/html";

export function mapWooToDomain(p: WooProduct): Product {
  const currency = pickCurrency(p.currency as any);
  const regIrr = parseAmount(p.regular_price);
  const saleIrr = parseAmount(p.sale_price);
  const baseIrr = parseAmount(p.price || p.regular_price);

  const irrToPreferred = (n: number) => (currency === "IRR" ? n : irrToIrt(n));

  const images: MediaImage[] = (p.images || []).map((img) => ({
    id: img.id,
    url: img.src,
    alt: img.alt || img.name,
  }));

  const categories: Category[] = (p.categories || []).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
  }));

  const attributes: Attribute[] = (p.attributes || []).map((a) => ({
    id: a.id,
    name: a.name,
    value: a.option,
  }));

  const price = toPrice(irrToPreferred(baseIrr), currency);
  const regularPrice = regIrr
    ? toPrice(irrToPreferred(regIrr), currency)
    : undefined;
  const salePrice = saleIrr
    ? toPrice(irrToPreferred(saleIrr), currency)
    : undefined;

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    url: p.permalink,
    price,
    regularPrice,
    salePrice,
    stock: {
      status: mapWooStockStatus(p.stock_status),
      quantity: p.stock_quantity ?? undefined,
    },
    images,
    categories,
    attributes,
    summary: stripHtml(p.short_description),
    description: stripHtml(p.description),
  };
}
