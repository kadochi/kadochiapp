export type RawWooStatus =
  | "pending"
  | "pending-payment"
  | "processing"
  | "on-hold"
  | "completed"
  | "cancelled"
  | "canceled"
  | "refunded"
  | "failed"
  | "draft"
  | string

export type OrderStatus =
  | "pending"
  | "processing"
  | "on-hold"
  | "completed"
  | "canceled"
  | "refunded"
  | "failed"
  | "draft"

export type OrderLineItem = {
  id: number | string
  product_id?: number | string | null
  name?: string
  quantity?: number
  image?: { src: string; alt?: string } | null
}

export type OrderSummary = {
  id: number | string
  status: OrderStatus
  created_at: string
  total: number
  line_items: OrderLineItem[]
}

export type OrderDetail = {
  id: number | string
  status: OrderStatus
  created_at: string
  sender?: string
  receiver?: string
  delivery_window?: string
  address?: string
  postcard_message?: string
  items: Array<{ id: number | string; name?: string; image?: string | null }>
  summary: {
    subtotal?: number
    tax?: number
    shipping?: number
    service?: number
    total?: number
  }
}
