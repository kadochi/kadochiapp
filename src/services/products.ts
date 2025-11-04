// src/services/products.ts
import { wpGetProduct, wpListProducts } from "@/lib/api/wp";
import {
  mapStoreProduct,
  mapStoreProducts,
  type Product,
} from "@/lib/mappers/product";

/** List by store API with params (server-friendly) */
export async function listProducts(
  params?: Record<string, any>
): Promise<Product[]> {
  const data = await wpListProducts(params);
  return mapStoreProducts(data);
}

/** Bulk by IDs (parallel) */
export async function getProductsByIds(
  ids: Array<number | string>
): Promise<Product[]> {
  const numericIds = (ids || [])
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (!numericIds.length) return [];

  const promises = numericIds.map((id) => wpGetProduct(id).catch(() => null));
  const results = (await Promise.all(promises)).filter(Boolean) as any[];
  return results.map(mapStoreProduct);
}
