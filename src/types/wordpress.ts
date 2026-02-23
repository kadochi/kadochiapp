// Shared WordPress entity types (server & client safe)

export type WordPressID = number;
export type WordPressSlug = string;

export interface WordPressRenderedText {
  rendered: string;
  protected?: boolean;
}

export interface WordPressBaseEntity {
  id: WordPressID;
  date?: string;
  date_gmt?: string;
  modified?: string;
  modified_gmt?: string;
  slug?: WordPressSlug;
  link?: string;
}

export interface WordPressPost extends WordPressBaseEntity {
  type: "post" | string;
  title?: WordPressRenderedText | null;
  content?: WordPressRenderedText | null;
  excerpt?: WordPressRenderedText | null;
  author?: WordPressID;
  featured_media?: WordPressID;
  categories?: WordPressID[];
  tags?: WordPressID[];
  meta?: Record<string, unknown>;
}

export interface WordPressPage extends WordPressBaseEntity {
  type: "page" | string;
  title?: WordPressRenderedText | null;
  content?: WordPressRenderedText | null;
  template?: string;
  parent?: WordPressID | null;
  meta?: Record<string, unknown>;
}

export interface WordPressMedia extends WordPressBaseEntity {
  mime_type?: string;
  source_url?: string;
  alt_text?: string;
  media_type?: string;
  media_details?: {
    width?: number;
    height?: number;
    sizes?: Record<
      string,
      { file: string; width: number; height: number; mime_type: string; source_url: string }
    >;
  };
}

export interface WordPressCategory {
  id: WordPressID;
  name: string;
  slug: WordPressSlug;
  description?: string;
  parent?: WordPressID;
  count?: number;
}

export interface WordPressTag {
  id: WordPressID;
  name: string;
  slug: WordPressSlug;
  description?: string;
}

export interface WooMoney {
  currency: string;
  value: string;
}

export interface WooProductPriceRange {
  min_price: string;
  max_price: string;
  min_regular_price?: string;
  max_regular_price?: string;
}

export interface WooStoreProduct {
  id: WordPressID;
  name: string;
  slug: WordPressSlug;
  description?: string;
  short_description?: string;
  images?: Array<{ id: WordPressID; src: string; alt?: string; name?: string }>;
  prices?: WooProductPriceRange & {
    price?: string;
    regular_price?: string;
    sale_price?: string;
    currency_code?: string;
  };
  average_rating?: string;
  rating_count?: number;
  categories?: Array<{ id: WordPressID; name: string; slug: WordPressSlug }>;
  tags?: Array<{ id: WordPressID; name: string; slug: WordPressSlug }>;
  is_purchasable?: boolean;
  type?: string;
  meta_data?: Array<{ key: string; value: unknown }>;
  stock_quantity?: number | null;
  stock_status?: string;
}

export interface WooOrderLineItem {
  id?: number;
  name?: string;
  product_id?: number;
  variation_id?: number;
  quantity?: number;
  subtotal?: string;
  total?: string;
  price?: number;
  meta_data?: Array<{ key: string; value: unknown }>;
}

export interface WooOrder extends WordPressBaseEntity {
  number?: string;
  status?: string;
  currency?: string;
  total?: string;
  customer_id?: number;
  payment_method?: string;
  payment_method_title?: string;
  line_items?: WooOrderLineItem[];
  shipping_lines?: Array<{ method_title?: string; total?: string }>;
  fee_lines?: Array<{ name?: string; total?: string }>;
  meta_data?: Array<{ key: string; value: unknown }>;
}

export interface WordPressOccasion {
  id?: number;
  author?: number;
  acf?: {
    title?: string;
    occasion_date?: string;
    repeat_yearly?: boolean;
    user_id?: number | string | null;
  };
}

export type WordPressEntity =
  | WordPressPost
  | WordPressPage
  | WordPressMedia
  | WordPressCategory
  | WordPressTag
  | WooStoreProduct
  | WooOrder;
