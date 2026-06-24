import type { z } from "zod";
import type { wooStoreProductSchema, wooStoreCategorySchema } from "./schema";

export type Currency = "IRR" | "IRT" | "USD";

export interface Price {
  amount: number;
  currency: Currency;
}

export type StockStatus = "in_stock" | "out_of_stock" | "backorder";

export interface MediaImage {
  id: number;
  url: string;
  alt?: string;
  width?: number;
  height?: number;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
}

export interface Attribute {
  id: number;
  name: string;
  value?: string;
}

export interface Product {
  id: number;
  slug: string;
  name: string;
  url: string;
  price: Price;
  regularPrice?: Price;
  salePrice?: Price;
  stock: { status: StockStatus; quantity?: number | null };
  images: MediaImage[];
  categories: Category[];
  attributes: Attribute[];
  summary?: string;
  description?: string;
}

export interface ProductCard {
  id: number | string;
  name: string;
  images?: Array<{ url: string; alt?: string }>;
  price: { amount: number; currency: string };
  regularPrice?: { amount: number; currency: string };
  salePrice?: { amount: number; currency: string };
  stock?: { inStock: boolean; status?: string | null };
}

export interface ProductDetail {
  id: number;
  name: string;
  images: Array<{ url: string; alt?: string }>;
  descriptionHtml: string;
  descriptionPlain: string;
  price: { amount: number; currency: string };
  regularPrice?: { amount: number; currency: string };
  salePrice?: { amount: number; currency: string };
  previousPrice?: number;
  offPercent?: number | null;
  stock: { inStock: boolean; status?: string | null };
  attributes: Array<{ name: string; value: string }>;
  tags: Array<{ id: number; name: string; slug?: string }>;
  categories: Array<{ id: number; name: string; slug?: string }>;
  ratingAvg: number;
  reviewsCount: number;
  comments?: ProductComment[];
}

export interface ProductComment {
  id: number | string;
  authorName?: string | null;
  avatarUrl?: string | null;
  rating?: number | null;
  date?: string | Date | null;
  content: string;
}

export type StoreCategory = {
  id: number;
  name: string;
  slug: string;
  image?: { src?: string | null } | null;
};

export type WooStoreProduct = z.infer<typeof wooStoreProductSchema>;
export type WooStoreCategory = z.infer<typeof wooStoreCategorySchema>;
