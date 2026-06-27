import "server-only"
import { cache } from "react"
import { getSessionFromCookies } from "@/modules/auth/services/session"
import { wooFetch } from "@/lib/api/woo"
import {
  onlyDigits, mapStatus, normaliseLineItem, normaliseOrderSummary,
  mapOrderDetailPayload, findCustomerIdByPhone, fetchOrdersResponse,
  ORDER_SUMMARY_FIELDS, ORDER_DETAIL_FIELDS,
} from "./orders.helpers"
import type { OrderSummary, OrderDetail } from "./orders.types"

export async function fetchOrdersForCustomer(
  customerId: number,
  page = 1,
  perPage = 5,
): Promise<OrderSummary[]> {
  const qs = new URLSearchParams({
    customer: String(customerId),
    per_page: String(Math.max(1, Math.min(perPage, 50))),
    page: String(Math.max(1, page)),
    orderby: "date",
    order: "desc",
    status: "any",
    dp: "0",
    _fields: ORDER_SUMMARY_FIELDS,
  })

  let res = await fetchOrdersResponse(qs)

  if (!res.ok && (res.status === 400 || res.status === 404)) {
    const qs2 = new URLSearchParams(qs)
    qs2.delete("status")
    res = await fetchOrdersResponse(qs2)
  }

  if (!res.ok) {
    const e = new Error(`upstream_error_${res.status}`) as any
    e.status = res.status >= 500 ? 502 : res.status
    throw e
  }

  const data = (await res.json().catch(() => [])) as any[]
  if (!Array.isArray(data)) return []

  return data.map((o) => {
    const items: any[] = Array.isArray(o?.line_items) ? o.line_items : []
    const patched = items.map((li) =>
      li?.image?.src ? li : { ...li, image: normaliseLineItem(li).image },
    )
    return normaliseOrderSummary({ ...o, line_items: patched })
  })
}

export async function listOrdersForSessionPaged(
  page = 1,
  perPage = 5,
): Promise<OrderSummary[]> {
  const session = await getSessionFromCookies()
  const sessionId = typeof session.userId === "number" && session.userId > 0 ? session.userId : null
  const phoneDigits = onlyDigits(session.phone)

  if (!sessionId && !phoneDigits) {
    const err = new Error("unauthorized") as any
    err.status = 401
    throw err
  }

  const customerId = sessionId ?? (phoneDigits ? await findCustomerIdByPhone(phoneDigits) : null)
  if (!customerId) return []

  return await fetchOrdersForCustomer(customerId, page, perPage)
}

export async function getOrderDetailForSession(
  orderId: string | number,
): Promise<OrderDetail | null> {
  const idNum = Number(orderId)
  if (!Number.isFinite(idNum) || idNum <= 0) {
    const err = new Error("bad_id") as any
    err.status = 400
    throw err
  }

  const session = await getSessionFromCookies()
  const sessionUserId = typeof session.userId === "number" && session.userId > 0 ? session.userId : null
  const sessionPhone = onlyDigits(session.phone)
  if (!sessionUserId && !sessionPhone) {
    const err = new Error("unauthorized") as any
    err.status = 401
    throw err
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    const res = await wooFetch(
      `/wp-json/wc/v3/orders/${idNum}?_fields=${ORDER_DETAIL_FIELDS}&dp=0`,
      { method: "GET", cache: "no-store", revalidateSeconds: 0, signal: controller.signal },
    )

    if (res.status === 404) return null
    if (!res.ok) {
      const err = new Error("upstream_error") as any
      err.status = 502
      throw err
    }

    const data = (await res.json()) as any
    if (!data || typeof data !== "object") {
      const err = new Error("upstream_error") as any
      err.status = 502
      throw err
    }

    const orderCustomerId = Number(data?.customer_id || 0) || null
    const orderPhone = onlyDigits(data?.billing?.phone)
    const ownsOrder =
      (sessionUserId && orderCustomerId && sessionUserId === orderCustomerId) ||
      (sessionPhone && orderPhone && sessionPhone === orderPhone)
    if (!ownsOrder) {
      const err = new Error("forbidden") as any
      err.status = 403
      throw err
    }

    return mapOrderDetailPayload(data)
  } catch (error: any) {
    if (error?.name === "AbortError") {
      const err = new Error("upstream_timeout") as any
      err.status = 504
      throw err
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}
