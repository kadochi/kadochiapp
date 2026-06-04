// src/app/api/checkout/start/route.ts
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session";
import {
  UpstreamBadResponse,
  UpstreamNetworkError,
  UpstreamTimeout,
} from "@/services/http/errors";
import {
  getZarinpalCallbackUrlForOrder,
  requestPayment,
} from "@/services/payment/zarinpal";
import { resolveWooUrl, wooFetch, wooFetchJSON } from "@/lib/api/woo";

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
  packaging?: {
    id?: "normal" | "gift";
    title?: string;
    price?: number;
    postcard_message?: string;
  } | null;
  payMethod: "online";
};

function onlyDigits(s?: string) {
  return String(s || "").replace(/\D+/g, "");
}
function safeEmail(e?: string) {
  const s = (e || "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : undefined;
}

async function findCustomerIdByPhone(phone: string): Promise<number | null> {
  const norm = onlyDigits(phone);
  if (!norm) return null;

  const searchParams = new URLSearchParams({
    per_page: "20",
    search: norm,
    _fields: "id,billing.phone",
  });

  const fallbackParams = new URLSearchParams({
    per_page: "50",
    orderby: "date",
    order: "desc",
    _fields: "id,billing.phone",
  });

  const fetchCustomers = async (qs: URLSearchParams) => {
    try {
      const data = await wooFetchJSON<
        Array<{ id?: number; billing?: { phone?: string } }>
      >(`/wp-json/wc/v3/customers?${qs.toString()}`, {
        method: "GET",
        cache: "no-store",
        timeoutMs: 7000,
      });
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  };

  const searchHits = await fetchCustomers(searchParams);
  const directMatch = searchHits.find(
    (c) => onlyDigits(c?.billing?.phone || "") === norm,
  );
  if (directMatch?.id) return Number(directMatch.id);

  const fallbackHits = await fetchCustomers(fallbackParams);
  const fallbackMatch = fallbackHits.find(
    (c) => onlyDigits(c?.billing?.phone || "") === norm,
  );
  if (fallbackMatch?.id) return Number(fallbackMatch.id);

  return null;
}

async function parseWooOrderResponse(res: Response): Promise<any> {
  const text = await res.text().catch(() => "");
  let json: any = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }

  if (!res.ok || !json || typeof json !== "object") {
    const err = new UpstreamBadResponse(
      502,
      "order_create_failed",
    ) as UpstreamBadResponse & {
      detail?: unknown;
      upstreamStatus?: number;
    };
    err.detail = json ?? text;
    err.upstreamStatus = res.status;
    throw err;
  }

  return json;
}

async function submitWooOrder(orderPayload: unknown): Promise<any> {
  const init = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    timeoutMs: 12_000,
    cache: "no-store" as const,
    body: JSON.stringify(orderPayload),
  } satisfies Parameters<typeof wooFetch>[1];

  const wooUrl = "/wp-json/wc/v3/orders";
  const wooTarget = resolveWooUrl(wooUrl);
  console.log(
    `[checkout/start/submitWooOrder] POST ${wooTarget} payload=${JSON.stringify({ ...(orderPayload as any), meta_data: "(present)", line_items: `(${((orderPayload as any)?.line_items || []).length} items)` })}`
  );

  try {
    const res = await wooFetch(wooUrl, init);
    const parsed = await parseWooOrderResponse(res);
    console.log(
      `[checkout/start/submitWooOrder] success orderId=${parsed?.id} status=${res.status}`
    );
    return parsed;
  } catch (error) {
    const extra =
      error instanceof UpstreamNetworkError
        ? { syscallCode: error.syscallCode, details: error.details }
        : {};
    console.error(
      `[checkout/start/submitWooOrder] failed target=${wooTarget} error=${error instanceof Error ? error.message : String(error)}`,
      extra,
    );
    throw error;
  }
}

function noStore<T>(response: NextResponse<T>) {
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Vary", "Cookie");
  return response;
}

async function resolvePayCookieDomain(): Promise<string | undefined> {
  const want = (process.env.COOKIE_DOMAIN || "").trim();
  if (!want) return undefined;
  const host = ((await headers()).get("host") || "").toLowerCase();
  return host.endsWith(want.toLowerCase()) ? want : undefined;
}

function paymentErrorResponse(error: unknown) {
  if (error instanceof UpstreamTimeout) {
    return noStore(
      NextResponse.json(
        { ok: false, error: "upstream_timeout" },
        { status: error.status },
      ),
    );
  }
  if (error instanceof UpstreamNetworkError) {
    return noStore(
      NextResponse.json(
        { ok: false, error: "upstream_network" },
        { status: error.status },
      ),
    );
  }
  if (error instanceof UpstreamBadResponse) {
    if (error.status === 400 && error.message === "invalid_amount") {
      return noStore(
        NextResponse.json(
          { ok: false, error: "invalid_amount" },
          { status: 400 },
        ),
      );
    }
    if (error.status === 500 && error.message === "missing_merchant_id") {
      return noStore(
        NextResponse.json(
          { ok: false, error: "missing_merchant_id" },
          { status: 500 },
        ),
      );
    }
    if (error.status === 500 && error.message === "missing_callback_url") {
      return noStore(
        NextResponse.json(
          { ok: false, error: "missing_callback_url" },
          { status: 500 },
        ),
      );
    }
    if (error.status === 400 && error.message === "invalid_callback_url") {
      return noStore(
        NextResponse.json(
          { ok: false, error: "invalid_callback_url" },
          { status: 400 },
        ),
      );
    }
    const status = error.status >= 400 ? error.status : 502;
    return noStore(
      NextResponse.json(
        { ok: false, error: "zarinpal_start_failed", status },
        { status },
      ),
    );
  }
  const detail = error instanceof Error ? error.message : String(error);
  return noStore(
    NextResponse.json(
      { ok: false, error: "server_error", detail },
      { status: 500 },
    ),
  );
}

export async function POST(req: NextRequest) {
  try {
    const sess = await getSessionFromCookies().catch(() => ({}) as any);
    const sessPhone = (sess?.phone || sess?.mobile || "").toString();
    const sessUserId = typeof sess?.userId === "number" ? sess.userId : null;

    const body = (await req.json()) as CheckoutPayload;
    const email = safeEmail(body?.sender?.email);

    console.log(
      `[checkout/start] request items=${(body?.items || []).length} total=${body?.figures?.total} senderPhone=${(body?.sender?.phone || sessPhone).slice(0, 4)}*** delivery=${typeof body?.delivery === "object" ? (body.delivery as any)?.slot_id : body?.delivery}`
    );

    let customer_id: number | null =
      typeof sessUserId === "number" && Number.isFinite(sessUserId)
        ? sessUserId
        : null;
    if (!customer_id && sessPhone)
      customer_id = await findCustomerIdByPhone(sessPhone);

    const shippingIRT = Math.max(
      0,
      Math.round(Number(body?.figures?.shipping ?? 0)),
    );
    const packagingIRT = Math.max(
      0,
      Math.round(Number(body?.figures?.packaging ?? 0)),
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
        (body.delivery as any).label || deliverySlotId || "",
      );
    }

    const packId = body?.packaging?.id || "normal";
    const packTitle =
      body?.packaging?.title ||
      (packId === "gift" ? "بسته‌بندی کادویی" : "بسته‌بندی عادی");
    const packPriceIRT = Math.max(
      0,
      Math.round(Number(body?.packaging?.price ?? packagingIRT)),
    );

    const amountIRT = Math.max(0, Math.round(Number(body.figures.total) || 0));

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
        {
          key: "_kadochi_zarinpal_amount_irt",
          value: String(amountIRT),
        },

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
        ...(body?.packaging?.postcard_message != null &&
        String(body.packaging.postcard_message).trim() !== ""
          ? [
              {
                key: "_kadochi_postcard_msg",
                value: String(body.packaging.postcard_message).trim(),
              },
            ]
          : []),
      ],
      ...(deliveryLabel ||
      (body?.packaging?.postcard_message != null &&
        String(body.packaging.postcard_message).trim() !== "")
        ? {
            customer_note: [
              deliveryLabel &&
                `زمان ارسال: ${deliveryLabel}${
                  deliverySlotId ? `  (Slot ID: ${deliverySlotId})` : ""
                }`,
              body?.packaging?.postcard_message != null &&
                String(body.packaging.postcard_message).trim() !== "" &&
                `متن کارت پستال: ${String(body.packaging.postcard_message).trim()}`,
            ]
              .filter(Boolean)
              .join("\n"),
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

    // --- Create Woo order (with fallback auth on 401/403) ---
    let json: any;
    try {
      json = await submitWooOrder(orderPayload);
    } catch (error) {
      if (
        error instanceof UpstreamBadResponse &&
        error.message === "order_create_failed"
      ) {
        const detail = (error as UpstreamBadResponse & { detail?: unknown })
          .detail;
        const upstreamStatus =
          (error as UpstreamBadResponse & { upstreamStatus?: number })
            .upstreamStatus ?? 502;
        console.error(
          `[checkout/start] order_create_failed status=${upstreamStatus} detail=${JSON.stringify(detail)}`
        );
        return noStore(
          NextResponse.json(
            {
              ok: false,
              error: "order_create_failed",
              status: upstreamStatus,
              detail,
            },
            { status: 502 },
          ),
        );
      }
      throw error;
    }

    const orderId = json?.id;
    const mobileDigits = onlyDigits(body?.sender?.phone || sessPhone);
    const callbackUrl = getZarinpalCallbackUrlForOrder(orderId);

    console.log(
      `[checkout/start] wooOrderCreated orderId=${orderId} amountIRT=${amountIRT} callbackUrl=${callbackUrl}`
    );

    try {
      const payment = await requestPayment(
        {
          amount: amountIRT,
          currency: "IRT",
          description: `پرداخت سفارش ${orderId}`,
          mobile: mobileDigits,
          email: email || "",
          orderId,
          callbackUrl,
        },
        { timeoutMs: 8_000 },
      );

      console.log(
        `[checkout/start] paymentInitiated orderId=${orderId} authority=${payment.authority} redirectUrl=${payment.url} code=${payment.code}`
      );

      const response = noStore(
        NextResponse.json({
          ok: true,
          redirectUrl: payment.url,
          orderId,
          amount: amountIRT,
        }),
      );

      const cookieDomain = await resolvePayCookieDomain();
      const cookieOpts = {
        path: "/",
        maxAge: 900,
        sameSite: "lax" as const,
        ...(cookieDomain ? { domain: cookieDomain } : {}),
      };
      response.cookies.set("kadochi_order_id", String(orderId), cookieOpts);
      response.cookies.set("kadochi_pay_amount", String(amountIRT), cookieOpts);

      return response;
    } catch (error) {
      console.error(
        `[checkout/start] paymentInitFailed orderId=${orderId} error=${error instanceof Error ? error.message : String(error)}`
      );
      return paymentErrorResponse(error);
    }
  } catch (e) {
    console.error(
      `[checkout/start] unhandled error=${e instanceof Error ? e.message : String(e)}`
    );
    if (e instanceof UpstreamTimeout) {
      return noStore(
        NextResponse.json(
          { ok: false, error: "upstream_timeout" },
          { status: e.status },
        ),
      );
    }
    if (e instanceof UpstreamNetworkError) {
      return noStore(
        NextResponse.json(
          { ok: false, error: "upstream_network" },
          { status: e.status },
        ),
      );
    }
    if (e instanceof UpstreamBadResponse) {
      return noStore(
        NextResponse.json(
          { ok: false, error: "upstream_bad_response" },
          { status: 502 },
        ),
      );
    }
    return noStore(
      NextResponse.json(
        { ok: false, error: "server_error", detail: String(e) },
        { status: 500 },
      ),
    );
  }
}
