import type { StockStatus } from "../models/product";

/**
 * Infer whether a product is in stock from Store/Woo API response.
 * Handles all stock_status variants: "outofstock", "out_of_stock", "out-of-stock".
 */
export function inferInStock(p: {
  stock_status?: string | null;
  is_in_stock?: boolean | null;
  is_purchasable?: boolean | null;
}): boolean {
  const st = String(p?.stock_status || "").toLowerCase();
  if (st === "outofstock" || st === "out_of_stock" || st === "out-of-stock")
    return false;
  if (p?.is_in_stock === false) return false;
  if (p?.is_purchasable === false) return false;
  return true;
}

export function mapWooStockStatus(s: string): StockStatus {
  switch (s) {
    case "instock":
      return "in_stock";
    case "onbackorder":
      return "backorder";
    default:
      return "out_of_stock";
  }
}
