import "server-only"

export type WpTagMeta = {
  id: number
  name: string
  description: string | null
}

export type StoreProduct = {
  id: number
  name: string
  slug?: string
  permalink?: string
  images?: Array<{ src?: string | null; alt?: string | null }>
  prices?: {
    price?: string | null
    regular_price?: string | null
    sale_price?: string | null
    currency_code?: string | null
  }
  is_in_stock?: boolean | null
  is_purchasable?: boolean | null
  stock_status?: string | null
  attributes?: any[]
  tags?: any[]
  categories?: any[]
  average_rating?: number | string | null
  rating_count?: number | null
  description?: string | null
  short_description?: string | null
}

export type WooProductV3 = {
  id: number
  name?: string
  description?: string | null
  short_description?: string | null
  images?: Array<{ src?: string | null; alt?: string | null }>
  price?: string | number | null
  regular_price?: string | number | null
  sale_price?: string | number | null
  currency?: string | null
  stock_status?: string | null
  manage_stock?: boolean | null
  stock_quantity?: number | null
  is_in_stock?: boolean | null
  is_purchasable?: boolean | null
  purchasable?: boolean | null
  attributes?: any[]
  average_rating?: string | number | null
  rating_count?: number | null
  tags?: Array<{ id?: number; name?: string; slug?: string }>
  categories?: Array<{ id?: number; name?: string; slug?: string }>
  meta_data?: Array<{ key?: string; value?: unknown }>
}

export type PagedResult<T> = {
  items: T[]
  page: number
  perPage: number
  total?: number
  totalPages?: number
}

export type SitemapProduct = {
  id: number
  date_modified?: string
  date_created?: string
}
