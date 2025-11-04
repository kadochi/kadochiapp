// Domain model for our app (decoupled from Woo raw shapes)
export type Currency = "IRR" | "IRT" | "USD";

export interface Price {
  amount: number; // in major units (e.g., Toman if IRT)
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
  summary?: string; // short description (sanitized)
  description?: string; // long description (sanitized)
}
