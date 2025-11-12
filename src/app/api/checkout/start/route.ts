// src/app/api/checkout/start/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session";
import {
  UpstreamBadResponse,
  UpstreamNetworkError,
  UpstreamTimeout,
} from "@/services/http/errors";
import { wordpressFetch } from "@/services/wordpress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CheckoutPayload = {
  items: { product_id: number; quantity: number }[];
  sender: {
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
  };
  receiver: { isSelf: boolean; name: string; phone?: string; address: string };
  figures: {
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
    shipping?: number;
    packaging?: number;
  };
  delivery?: string | { slot_id?: string; label?: string } | null;
  packaging?: { id?: "normal" | "gift"; title?: string; price?: number } | null;
  payMethod: "online";
};

function onlyDigits(s?: string) {
  return String(s || "").replace(/\D+/g, "");
}
function safeEmail(e?: string) {
  const s = (e || "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : undefined;
}
function wcUrl(path: string) {
  const WP = process.env.WP_BASE_URL!;
  const u = new URL(path, WP);
  u.searchParams.set("consumer_key", process.env.WC_CONSUMER_KEY || "");
  u.searchParams.set("consumer_secret", process.env.WC_CONSUMER_SECRET || "");
  return u.toString();
}
function resolveSelfBase(req: NextRequest) {
  try {
    return new URL(req.url).origin;
  } catch {
    return "http://localhost:3000";
  }
}

function btoaBasic(user: string, pass: string) {
  return "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
}
async function wooFetch<T = unknown>(path: string) {
  const base = process.env.WP_BASE_URL!,
    user = process.env.WP_APP_USER!,
    pass = process.env.WP_APP_PASS!;
  const url = new URL(path, base);
  try {
    const res = await wordpressFetch(url, {
      headers: {
        Authorization: btoaBasic(user, pass),
        "Content-Type": "application/json",
      },
      allowProxyFallback: true,
      timeoutMs: 7000,
    });
    const text = await res.text().catch(() => "");
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
    }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    if (err instanceof UpstreamTimeout) {
      return { ok: false, status: err.status, data: null };
    }
    if (err instanceof UpstreamBadResponse) {
      return { ok: false, status: err.status, data: null };
    }
    if (err instanceof UpstreamNetworkError) {
      return { ok: false, status: err.status, data: null };
    }
    return { ok: false, status: 502, data: null };
  }
}
async function findCustomerIdByPhone(phone: string): Promise<number | null> {
  const norm = onlyDigits(phone);
  const { ok, data } = await wooFetch<any[]>(
    "/wp-json/wc/v3/customers?per_page=50"
  );
  if (!ok || !Array.isArray(data)) return null;
  const hit =
    data.find((c) => onlyDigits(c?.billing?.phone || "") === norm) ?? null;
  return hit?.id ?? null;
}

export async function POST(req: NextRequest) {
  try {
    const sess = await getSessionFromCookies().catch(() => ({} as any));
    const sessPhone = (sess?.phone || sess?.mobile || "").toString();
    const sessUserId = typeof sess?.userId === "number" ? sess.userId : null;

    const body = (await req.json()) as CheckoutPayload;
    const email = safeEmail(body?.sender?.email);

    let customer_id: number | null =
      typeof sessUserId === "number" && Number.isFinite(sessUserId)
        ? sessUserId
        : null;
    if (!customer_id && sessPhone)
      customer_id = await findCustomerIdByPhone(sessPhone);

    const shippingIRT = Math.max(
      0,
      Math.round(Number(body?.figures?.shipping ?? 0))
    );
    const packagingIRT = Math.max(
      0,
      Math.round(Number(body?.figures?.packaging ?? 0))
    );
    const taxIRT = Math.max(0, Math.round(Number(body?.figures?.tax ?? 0)));

    const shippingIRR = shippingIRT * 10;
    const packagingIRR = packagingIRT * 10;
    const taxIRR = taxIRT * 10;

    let deliveryLabel = "";
    let deliverySlotId = "";
    if (typeof body?.delivery === "string") {
      deliveryLabel = body.delivery;
    } else if (body?.delivery && typeof body.delivery === "object") {
      deliverySlotId = String((body.delivery as any).slot_id || "");
      deliveryLabel = String(
        (body.delivery as any).label || deliverySlotId || ""
      );
    }

    const packId = body?.packaging?.id || "normal";
    const packTitle =
      body?.packaging?.title ||
      (packId === "gift" ? "بسته‌بندی کادویی" : "بسته‌بندی عادی");
    const packPriceIRT = Math.max(
      0,
      Math.round(Number(body?.packaging?.price ?? packagingIRT))
    );

    const orderPayload: any = {
      payment_method: "zarinpal",
      payment_method_title: "Zarinpal",
      set_paid: false,
      ...(customer_id ? { customer_id } : {}),
      billing: {
        first_name: body.sender.firstName,
        last_name: body.sender.lastName,
        phone: onlyDigits(body.sender.phone || sessPhone),
        address_1: body.receiver.address || "",
        ...(email ? { email } : {}),
      },
      shipping: {
        first_name: body.receiver.isSelf
          ? body.sender.firstName
          : body.receiver.name,
        last_name: body.receiver.isSelf ? body.sender.lastName : "",
        phone: onlyDigits(body.receiver.phone || sessPhone),
        address_1: body.receiver.address || "",
      },
      line_items: body.items.map((it) => ({
        product_id: it.product_id,
        quantity: it.quantity,
      })),
      meta_data: [
        { key: "_kadochi_receiver_name", value: body.receiver.name },
        { key: "_kadochi_is_self", value: body.receiver.isSelf ? "yes" : "no" },

        { key: "_kadochi_packaging", value: packId },
        { key: "_kadochi_packaging_title", value: packTitle },
        { key: "_kadochi_packaging_irt", value: String(packPriceIRT) },

        ...(deliveryLabel
          ? [
              { key: "_kadochi_delivery", value: deliveryLabel },
              { key: "_kadochi_delivery_label", value: deliveryLabel },
              { key: "kadochi_delivery_label", value: deliveryLabel },
            ]
          : []),
        ...(deliverySlotId
          ? [
              { key: "_kadochi_delivery_slot_id", value: deliverySlotId },
              { key: "kadochi_delivery_slot_id", value: deliverySlotId },
            ]
          : []),
      ],
      ...(deliveryLabel
        ? {
            customer_note: `زمان ارسال: ${deliveryLabel}${
              deliverySlotId ? `  (Slot ID: ${deliverySlotId})` : ""
            }`,
          }
        : {}),
    };

    if (shippingIRR > 0) {
      orderPayload.shipping_lines = [
        {
          method_id: "flat_rate",
          method_title: "هزینه ارسال",
          total: String(shippingIRR),
          ...(deliveryLabel || deliverySlotId
            ? {
                meta_data: [
                  ...(deliveryLabel
                    ? [{ key: "kadochi_delivery_label", value: deliveryLabel }]
                    : []),
                  ...(deliverySlotId
                    ? [
                        {
                          key: "kadochi_delivery_slot_id",
                          value: deliverySlotId,
                        },
                      ]
                    : []),
                ],
              }
            : {}),
        },
      ];
      orderPayload.meta_data.push({
        key: "_kadochi_shipping_irt",
        value: String(shippingIRT),
      });
    }

    const fee_lines: Array<{ name: string; total: string }> = [];
    if (packagingIRR > 0 || packPriceIRT > 0) {
      const packTotalIRR = packagingIRR > 0 ? packagingIRR : packPriceIRT * 10;
      if (packTotalIRR > 0)
        fee_lines.push({
          name: `بسته‌بندی (${packTitle})`,
          total: String(packTotalIRR),
        });
    }
    if (taxIRR > 0) {
      fee_lines.push({ name: "مالیات بر ارزش افزوده", total: String(taxIRR) });
      orderPayload.meta_data.push({
        key: "_kadochi_vat_irt",
        value: String(taxIRT),
      });
    }
    if (fee_lines.length) orderPayload.fee_lines = fee_lines;

    let resp = await wordpressFetch(wcUrl("/wp-json/wc/v3/orders"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      allowProxyFallback: true,
      timeoutMs: 12_000,
      body: JSON.stringify(orderPayload),
    });
    let text = await resp.text().catch(() => "");
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {}

    if ([401, 403].includes(resp.status)) {
      const ck = process.env.WC_CONSUMER_KEY || "",
        cs = process.env.WC_CONSUMER_SECRET || "";
      const auth = "Basic " + Buffer.from(`${ck}:${cs}`).toString("base64");
      resp = await wordpressFetch(
        new URL("/wp-json/wc/v3/orders", process.env.WP_BASE_URL!).toString(),
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: auth },
          allowProxyFallback: true,
          timeoutMs: 12_000,
          body: JSON.stringify(orderPayload),
        }
      );
      text = await resp.text().catch(() => "");
      json = null;
      try {
        json = JSON.parse(text);
      } catch {}
    }

    if (!resp.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "order_create_failed",
          status: resp.status,
          detail: json || text,
        },
        { status: 502 }
      );
    }

    const orderId = json?.id;
    const amountIRT = Math.round(Number(body.figures.total) || 0);

    const selfBase = resolveSelfBase(req);
    const start = await fetch(`${selfBase}/api/pay/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        amount: amountIRT,
        currency: "IRT",
        description: `پرداخت سفارش ${orderId}`,
        mobile: onlyDigits(body?.sender?.phone || sessPhone),
        email: email || "",
        orderId,
      }),
    });
    const startJson: any = await start.json().catch(() => ({}));
    if (!start.ok || !startJson?.ok || !startJson?.url) {
      return NextResponse.json(
        {
          ok: false,
          error: "zarinpal_start_failed",
          status: start.status,
          detail: startJson,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      redirectUrl: startJson.url,
      orderId,
      amount: amountIRT,
    });
  } catch (e) {
    if (e instanceof UpstreamTimeout) {
      return NextResponse.json(
        { ok: false, error: "upstream_timeout" },
        { status: e.status }
      );
    }
    if (e instanceof UpstreamNetworkError) {
      return NextResponse.json(
        { ok: false, error: "upstream_network" },
        { status: e.status }
      );
    }
    if (e instanceof UpstreamBadResponse) {
      return NextResponse.json(
        { ok: false, error: "upstream_bad_response" },
        { status: 502 }
      );
    }
    return NextResponse.json(
      { ok: false, error: "server_error", detail: String(e) },
      { status: 500 }
    );
  }
}
