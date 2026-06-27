import { cache } from "react"
import { getWooBaseUrl } from "@/config/wp"
import { wooFetch } from "@/lib/api/woo"
import { formatDeliveryWindow } from "@/modules/checkout/utils/delivery-slot"
import type { RawWooStatus, OrderStatus, OrderLineItem, OrderSummary, OrderDetail } from "./orders.types"

const CUSTOMER_TIMEOUT_MS = 4500
const ORDERS_TIMEOUT_MS = 8000

export const ORDER_DETAIL_FIELDS = [
  "id", "status", "date_created", "date_created_gmt",
  "customer_id", "billing", "shipping", "line_items",
  "fee_lines", "total", "total_tax", "shipping_total", "meta_data",
].join(",")

export const ORDER_SUMMARY_FIELDS = [
  "id", "status", "date_created", "date_created_gmt", "total",
  "line_items", "line_items.id", "line_items.product_id",
  "line_items.name", "line_items.quantity", "line_items.image",
  "line_items.image.src", "line_items.image.url",
  "line_items.image_url", "line_items.thumbnail",
].join(",")

export const CUSTOMER_SUMMARY_FIELDS = ["id", "billing"].join(",")

export function onlyDigits(v?: string | null) {
  return String(v || "").replace(/\D+/g, "")
}

function stableId(...parts: Array<string | number | undefined>): string {
  return parts.filter(Boolean).map(String).join(":")
}

export function mapStatus(raw?: RawWooStatus): OrderStatus {
  const v = String(raw || "").toLowerCase().replace(/\s+/g, "-")
  switch (v) {
    case "pending": case "pending-payment": return "pending"
    case "processing": return "processing"
    case "on-hold": return "on-hold"
    case "completed": return "completed"
    case "cancelled": case "canceled": return "canceled"
    case "refunded": return "refunded"
    case "failed": return "failed"
    case "draft": return "draft"
    default: return "pending"
  }
}

function absolutize(url?: string | null): string | null {
  if (!url) return null
  try {
    const base = new URL(getWooBaseUrl())
    const full = new URL(url, base)
    if (full.protocol === "http:") full.protocol = "https:"
    return full.toString()
  } catch {
    return null
  }
}

export async function fetchCustomerCandidates(
  qs: URLSearchParams,
  timeoutMs = CUSTOMER_TIMEOUT_MS,
): Promise<any[]> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await wooFetch(`/wp-json/wc/v3/customers?${qs.toString()}`, {
      method: "GET", cache: "no-store", revalidateSeconds: 0, signal: controller.signal,
    })
    if (!res.ok) return []
    const data = (await res.json().catch(() => [])) as any[]
    return Array.isArray(data) ? data : []
  } catch (error: any) {
    if (error?.name === "AbortError") return []
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

export async function fetchOrdersResponse(
  qs: URLSearchParams,
  options?: { timeoutMs?: number },
): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), options?.timeoutMs ?? ORDERS_TIMEOUT_MS)
  try {
    return await wooFetch(`/wp-json/wc/v3/orders?${qs.toString()}`, {
      method: "GET", cache: "no-store", revalidateSeconds: 0, signal: controller.signal,
    })
  } catch (error: any) {
    if (error?.name === "AbortError") {
      const e = new Error("upstream_timeout") as any
      e.status = 504
      throw e
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

export function normaliseLineItem(li: any): OrderLineItem {
  const candidate = li?.image?.src || li?.image?.url || li?.image_url || li?.thumbnail || (typeof li?.image === "string" ? li.image : "")
  const abs = absolutize(candidate)
  return {
    id: li?.id ?? li?.item_id ?? li?.product_id ?? stableId("li", li?.name, li?.product_id),
    product_id: li?.product_id ?? null,
    name: li?.name ?? undefined,
    quantity: typeof li?.quantity === "number" ? li.quantity : undefined,
    image: abs ? { src: abs, alt: li?.name ?? undefined } : null,
  }
}

export function normaliseOrderSummary(order: any): OrderSummary {
  const created = order?.date_created || order?.date_created_gmt || new Date().toISOString()
  const rawItems: any[] = Array.isArray(order?.line_items) ? order.line_items : []
  const lineItems = rawItems.map(normaliseLineItem)
  return {
    id: order?.id ?? order?.order_id ?? "",
    status: mapStatus(order?.status),
    created_at: created,
    total: Number(order?.total ?? order?.total_price ?? 0),
    line_items: lineItems,
  }
}

export function mapOrderDetailPayload(order: any): OrderDetail {
  const items = Array.isArray(order?.line_items)
    ? order.line_items.map((li: any) => {
        const n = normaliseLineItem(li)
        return { id: n.id, name: n.name, image: n.image?.src ?? null }
      })
    : []

  const meta: any[] = Array.isArray(order?.meta_data) ? order.meta_data : []
  const getMeta = (k: string) => meta.find((m) => String(m?.key) === k)?.value

  const receiverMeta = String(getMeta("_kadochi_receiver_name") || "")
  const receiverName = receiverMeta || `${order?.shipping?.first_name || ""} ${order?.shipping?.last_name || ""}`.trim()

  const senderName = `${order?.billing?.first_name || ""} ${order?.billing?.last_name || ""}`.trim()

  const addressParts = [order?.shipping?.state, order?.shipping?.city, order?.shipping?.address_1, order?.shipping?.address_2].filter(Boolean)
  const address = addressParts.join("، ")

  const deliveryLabelMeta = String(getMeta("_kadochi_delivery") || "")
  const deliverySlotMeta = String(getMeta("_kadochi_delivery_slot") || getMeta("_kadochi_slot_id") || getMeta("_kadochi_delivery_slot_id") || "")
  const deliveryWindow = deliveryLabelMeta || formatDeliveryWindow(deliverySlotMeta) || ""

  const postcardMessage = String(getMeta("_kadochi_postcard_msg") || "").trim()

  const subtotal = Array.isArray(order?.line_items)
    ? order.line_items.reduce((sum: number, li: any) => sum + Number(li?.subtotal || 0), 0)
    : 0
  const service = Array.isArray(order?.fee_lines)
    ? order.fee_lines.reduce((sum: number, f: any) => sum + Number(f?.total || 0), 0)
    : 0
  const total = Number(order?.total || 0)
  const tax = Number(order?.total_tax || 0)
  const shipping = Number(order?.shipping_total || 0)

  return {
    id: order?.id ?? order?.order_id ?? "",
    status: mapStatus(order?.status),
    created_at: order?.date_created || order?.date_created_gmt || new Date().toISOString(),
    sender: senderName || undefined,
    receiver: receiverName || undefined,
    delivery_window: deliveryWindow || undefined,
    address: address || undefined,
    postcard_message: postcardMessage || undefined,
    items,
    summary: { subtotal, tax, shipping, service, total },
  }
}

export const findCustomerIdByPhone = cache(async (phoneDigits: string): Promise<number | null> => {
  if (!phoneDigits) return null

  const searchQs = new URLSearchParams({ per_page: "20", search: phoneDigits, _fields: CUSTOMER_SUMMARY_FIELDS })
  const searchCandidates = await fetchCustomerCandidates(searchQs)
  const matchFromSearch = searchCandidates.find((c) => onlyDigits(c?.billing?.phone) === phoneDigits)
  if (matchFromSearch?.id) return Number(matchFromSearch.id)

  const fallbackQs = new URLSearchParams({ per_page: "50", orderby: "date", order: "desc", _fields: CUSTOMER_SUMMARY_FIELDS })
  const fallbackCandidates = await fetchCustomerCandidates(fallbackQs, CUSTOMER_TIMEOUT_MS + 1000)
  const matchFromFallback = fallbackCandidates.find((c) => onlyDigits(c?.billing?.phone) === phoneDigits)
  if (matchFromFallback?.id) return Number(matchFromFallback.id)

  return null
})
