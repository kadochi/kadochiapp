// Minimal WooCommerce REST types for catalog
export type CurrencyCode = "IRR" | "IRT" | "USD" | "EUR";

export type WooStockStatus = "instock" | "outofstock" | "onbackorder";

export interface WooImage {
  id: number;
  src: string;
  name: string;
  alt?: string;
}

export interface WooCategoryRef {
  id: number;
  name: string;
  slug: string;
}

export interface WooAttributeRef {
  id: number;
  name: string;
  option?: string;
}

export interface WooProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  type: string; // simple, variable
  status: string; // publish
  price: string; // e.g. "2500000"
  regular_price: string;
  sale_price: string;
  currency?: CurrencyCode;
  stock_status: WooStockStatus;
  stock_quantity: number | null;
  manage_stock: boolean;
  images: WooImage[];
  categories: WooCategoryRef[];
  attributes: WooAttributeRef[];
  short_description?: string;
  description?: string;
}
