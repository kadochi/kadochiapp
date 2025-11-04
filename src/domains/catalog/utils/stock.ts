import type { StockStatus } from "../models/product";

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
