import { NextRequest, NextResponse } from "next/server";

import { wooFetch } from "@/lib/api/woo";
import {
  UpstreamBadResponse,
  UpstreamNetworkError,
  UpstreamTimeout,
} from "@/services/http/errors";
import { verifyPayment } from "@/services/payment/zarinpal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ZARINPAL_AMOUNT_META_KEY = "_kadochi_zarinpal_amount_irt";

type VerifyBody = {
  Authority?: string;
  amount?: number;
  currency?: "IRT" | "IRR";
  orderId?: string | number;
};

function noStore<T>(response: NextResponse<T>) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

async function resolvePayAmountIrt(
  orderId: string,
  clientAmount: number,
): Promise<number> {
  try {
    const res = await wooFetch(
      `/wp-json/wc/v3/orders/${orderId}?_fields=id,meta_data,total`,
      { method: "GET", cache: "no-store", timeoutMs: 8_000 },
    );
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.warn(
        `[pay/verify] Woo order fetch failed orderId=${orderId} status=${res.status} body=${txt.slice(0, 200)}`,
      );
      return clientAmount;
    }

    const data = (await res.json().catch(() => null)) as {
      meta_data?: Array<{ key?: string; value?: string }>;
      total?: string | number;
    } | null;

    const meta = Array.isArray(data?.meta_data) ? data.meta_data : [];
    const stored = meta.find((m) => m?.key === ZARINPAL_AMOUNT_META_KEY)?.value;
    const fromMeta = Math.floor(Number(stored || 0));
    if (Number.isFinite(fromMeta) && fromMeta > 0) {
      console.log(
        `[pay/verify] amount from Woo meta orderId=${orderId} amountIRT=${fromMeta}`,
      );
      return fromMeta;
    }

    const totalIrr = Number(data?.total || 0);
    if (Number.isFinite(totalIrr) && totalIrr > 0) {
      const fromTotal = Math.round(totalIrr / 10);
      console.log(
        `[pay/verify] amount from Woo total orderId=${orderId} totalIRR=${totalIrr} amountIRT=${fromTotal}`,
      );
      return fromTotal;
    }
  } catch (e) {
    console.error(
      `[pay/verify] resolvePayAmountIrt error orderId=${orderId} error=${e instanceof Error ? e.message : String(e)}`,
    );
  }

  return clientAmount;
}

function mapError(error: unknown) {
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
    if (error.status === 400 && error.message === "invalid_input") {
      return noStore(
        NextResponse.json(
          { ok: false, error: "invalid_input" },
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
    const status = error.status >= 400 ? error.status : 502;
    return noStore(
      NextResponse.json(
        { ok: false, error: "zarinpal_verify_failed", status },
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
    const body = (await req.json().catch(() => ({}))) as VerifyBody;
    const authority = String(body?.Authority || "").trim();
    const orderIdRaw = body?.orderId;
    const orderId = orderIdRaw ? String(orderIdRaw).trim() : "";
    let amount = Math.floor(Number(body?.amount ?? 0));

    console.log(
      `[pay/verify] request authority=${authority} clientAmount=${amount} orderId=${orderId} currency=${body?.currency}`,
    );

    if (!authority) {
      console.warn(`[pay/verify] invalid_input missing authority`);
      return noStore(
        NextResponse.json(
          { ok: false, error: "invalid_input" },
          { status: 400 },
        ),
      );
    }

    if (orderId) {
      amount = await resolvePayAmountIrt(orderId, amount);
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      console.warn(
        `[pay/verify] invalid_input authority="${authority}" amount=${amount} orderId=${orderId}`,
      );
      return noStore(
        NextResponse.json(
          { ok: false, error: "invalid_input" },
          { status: 400 },
        ),
      );
    }

    const result = await verifyPayment(
      {
        authority,
        amount,
        currency: body.currency,
      },
      { timeoutMs: 8_000 },
    );

    console.log(
      `[pay/verify] verifyResult paid=${result.paid} code=${result.code} ref_id=${result.ref_id} card_pan=${result.card_pan} amount=${amount}`,
    );

    if (result.paid && orderId) {
      const wooUrl = `/wp-json/wc/v3/orders/${orderId}`;
      console.log(`[pay/verify] updating Woo order ${wooUrl}`);
      try {
        const meta: Array<{ key: string; value: string }> = [];

        if (result.ref_id) {
          meta.push({
            key: "_zarinpal_ref_id",
            value: String(result.ref_id),
          });
        }
        if (result.card_pan) {
          meta.push({
            key: "_zarinpal_card_pan",
            value: String(result.card_pan),
          });
        }

        const updatePayload: Record<string, unknown> = {
          set_paid: true,
          status: "on-hold",
        };

        if (meta.length) {
          updatePayload.meta_data = meta;
        }

        const res = await wooFetch(wooUrl, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify(updatePayload),
          timeoutMs: 8_000,
        });

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          console.error(
            `[pay/verify] failed to update Woo order status=${res.status} body=${txt}`,
          );
        } else {
          console.log(
            `[pay/verify] Woo order ${orderId} updated successfully set_paid=true status=on-hold`,
          );
        }
      } catch (e) {
        console.error(
          `[pay/verify] Woo update error orderId=${orderId} error=${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    return noStore(
      NextResponse.json({
        ok: true,
        paid: result.paid,
        code: result.code,
        ref_id: result.ref_id,
        card_pan: result.card_pan,
        raw: result.raw,
      }),
    );
  } catch (error) {
    console.error(
      `[pay/verify] unexpected error=${error instanceof Error ? error.message : String(error)}`,
    );
    return mapError(error);
  }
}
