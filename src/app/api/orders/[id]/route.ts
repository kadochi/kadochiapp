import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RawWooStatus =
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
  | string;

type Status =
  | "pending"
  | "processing"
  | "on-hold"
  | "completed"
  | "canceled"
  | "refunded"
  | "failed"
  | "draft";

function mapStatus(raw?: RawWooStatus): Status {
  const v = String(raw || "")
    .toLowerCase()
    .replace(/\s+/g, "-");
  switch (v) {
    case "pending":
    case "pending-payment":
      return "pending";
    case "processing":
      return "processing";
    case "on-hold":
      return "on-hold";
    case "completed":
      return "completed";
    case "cancelled":
    case "canceled":
      return "canceled";
    case "refunded":
      return "refunded";
    case "failed":
      return "failed";
    case "draft":
      return "draft";
    default:
      return "pending";
  }
}

function btoaBasic(user: string, pass: string) {
  return "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
}
function onlyDigits(s?: string) {
  return String(s || "").replace(/[^\d]+/g, "");
}

async function wooFetch<T = any>(
  path: string,
  {
    revalidate = 20,
    signal,
  }: { revalidate?: number; signal?: AbortSignal } = {}
) {
  const base = process.env.WP_BASE_URL!;
  const user = process.env.WP_APP_USER!;
  const pass = process.env.WP_APP_PASS!;
  const url = new URL(path, base);

  const FIELDS = [
    "id",
    "status",
    "date_created",
    "date_created_gmt",
    "customer_id",
    "billing",
    "shipping",
    "line_items",
    "fee_lines",
    "total",
    "total_tax",
    "shipping_total",
    "meta_data",
  ].join(",");
  if (!url.searchParams.has("_fields")) url.searchParams.set("_fields", FIELDS);

  const r = await fetch(url.toString(), {
    headers: {
      Authorization: btoaBasic(user, pass),
      "Content-Type": "application/json",
    },
    cache: "force-cache",
    next: { revalidate },
    signal,
  });

  let data: any = null;
  try {
    data = await r.json();
  } catch {}
  return { ok: r.ok, status: r.status, data };
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ orderId?: string; id?: string }> }
) {
  try {
    const p = await ctx.params;
    const orderId = (p.orderId ?? p.id ?? "").trim();
    const idNum = Number(orderId);
    if (!orderId || !Number.isFinite(idNum) || idNum <= 0) {
      return NextResponse.json({ ok: false, error: "bad_id" }, { status: 400 });
    }

    const sess = await getSessionFromCookies();
    const sessUserId =
      typeof (sess as any).userId === "number" ? (sess as any).userId : null;
    const sessPhone = onlyDigits((sess as any).phone);

    if (!sessUserId && !sessPhone) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );
    }

    const ctl = new AbortController();
    const timeout = setTimeout(() => ctl.abort(), 6000);

    const { ok, status, data } = await wooFetch<any>(
      `/wp-json/wc/v3/orders/${idNum}`,
      { revalidate: 20, signal: ctl.signal }
    );

    clearTimeout(timeout);

    if (status === 404) return NextResponse.json({}, { status: 404 });
    if (!ok || !data || typeof data !== "object") {
      return NextResponse.json(
        { ok: false, error: "wc_error" },
        { status: 502 }
      );
    }

    const order = data;
    const orderCustomerId = Number(order?.customer_id || 0) || null;
    const orderPhone = onlyDigits(order?.billing?.phone);

    let isOwner = false;
    if (sessUserId && orderCustomerId && sessUserId === orderCustomerId)
      isOwner = true;
    else if (sessPhone && orderPhone && sessPhone === orderPhone)
      isOwner = true;

    if (!isOwner) {
      return NextResponse.json(
        { ok: false, error: "forbidden" },
        { status: 403 }
      );
    }

    const meta: any[] = Array.isArray(order?.meta_data) ? order.meta_data : [];
    const getMeta = (k: string) =>
      meta.find((m) => String(m?.key) === k)?.value ?? "";

    const receiverMeta = String(getMeta("_kadochi_receiver_name") || "");
    const receiver =
      receiverMeta ||
      `${order?.shipping?.first_name || ""} ${
        order?.shipping?.last_name || ""
      }`.trim();

    const delivery = String(getMeta("_kadochi_delivery") || "");
    const sender =
      `${order?.billing?.first_name || ""} ${
        order?.billing?.last_name || ""
      }`.trim() || "";
    const address = [
      order?.shipping?.state,
      order?.shipping?.city,
      order?.shipping?.address_1,
      order?.shipping?.address_2,
    ]
      .filter(Boolean)
      .join("، ");

    const items = Array.isArray(order?.line_items)
      ? order.line_items.map((li: any) => ({
          id: li?.id ?? li?.product_id ?? Math.random(),
          name: li?.name ?? "",
          image: li?.image?.src || li?.image_url || "",
        }))
      : [];

    const subtotal = Array.isArray(order?.line_items)
      ? order.line_items.reduce(
          (sum: number, li: any) => sum + Number(li?.subtotal || 0),
          0
        )
      : 0;

    const feeTotal = Array.isArray(order?.fee_lines)
      ? order.fee_lines.reduce(
          (sum: number, f: any) => sum + Number(f?.total || 0),
          0
        )
      : 0;

    const total = Number(order?.total || 0);
    const tax = Number(order?.total_tax || 0);
    const shipping = Number(order?.shipping_total || 0);

    const payload = {
      id: order.id,
      status: mapStatus(order?.status),
      created_at:
        order?.date_created ||
        order?.date_created_gmt ||
        new Date().toISOString(),
      sender,
      receiver,
      delivery_window: delivery,
      address,
      items,
      summary: { subtotal, tax, shipping, service: feeTotal, total },
    };

    const res = NextResponse.json(payload, { status: 200 });
    res.headers.set("Cache-Control", "s-maxage=20, stale-while-revalidate=60");
    return res;
  } catch (e: any) {
    if (e?.name === "AbortError") {
      return NextResponse.json(
        { ok: false, error: "upstream_timeout" },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}
