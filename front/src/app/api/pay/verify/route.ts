import { NextRequest, NextResponse } from "next/server";

import {
  UpstreamBadResponse,
  UpstreamNetworkError,
  UpstreamTimeout,
} from "@/services/http/errors";
import { verifyPayment } from "@/services/payment/zarinpal";
import { wordpressFetch } from "@/services/wordpress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function mapError(error: unknown) {
  if (error instanceof UpstreamTimeout) {
    return noStore(
      NextResponse.json(
        { ok: false, error: "upstream_timeout" },
        { status: error.status }
      )
    );
  }
  if (error instanceof UpstreamNetworkError) {
    return noStore(
      NextResponse.json(
        { ok: false, error: "upstream_network" },
        { status: error.status }
      )
    );
  }
  if (error instanceof UpstreamBadResponse) {
    if (error.status === 400 && error.message === "invalid_input") {
      return noStore(
        NextResponse.json(
          { ok: false, error: "invalid_input" },
          { status: 400 }
        )
      );
    }
    if (error.status === 500 && error.message === "missing_merchant_id") {
      return noStore(
        NextResponse.json(
          { ok: false, error: "missing_merchant_id" },
          { status: 500 }
        )
      );
    }
    const status = error.status >= 400 ? error.status : 502;
    return noStore(
      NextResponse.json(
        { ok: false, error: "zarinpal_verify_failed", status },
        { status }
      )
    );
  }
  const detail = error instanceof Error ? error.message : String(error);
  return noStore(
    NextResponse.json(
      { ok: false, error: "server_error", detail },
      { status: 500 }
    )
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as VerifyBody;
    const authority = String(body?.Authority || "").trim();
    const amount = Number(body?.amount ?? 0);
    const orderIdRaw = body?.orderId;
    const orderId = orderIdRaw ? String(orderIdRaw).trim() : "";

    console.log(
      `[pay/verify] request authority=${authority} amount=${amount} orderId=${orderId} currency=${body?.currency}`
    );

    if (!authority || !Number.isFinite(amount) || amount <= 0) {
      console.warn(
        `[pay/verify] invalid_input authority="${authority}" amount=${amount}`
      );
      return noStore(
        NextResponse.json(
          { ok: false, error: "invalid_input" },
          { status: 400 }
        )
      );
    }

    const result = await verifyPayment(
      {
        authority,
        amount,
        currency: body.currency,
      },
      { timeoutMs: 8_000 }
    );

    console.log(
      `[pay/verify] verifyResult paid=${result.paid} code=${result.code} ref_id=${result.ref_id} card_pan=${result.card_pan}`
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

        const updatePayload: any = {
          set_paid: true,
          status: "on-hold",
        };

        if (meta.length) {
          updatePayload.meta_data = meta;
        }

        const res = await wordpressFetch(wooUrl, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify(updatePayload),
          timeoutMs: 8_000,
        });

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          console.error(
            `[pay/verify] failed to update Woo order status=${res.status} body=${txt}`
          );
        } else {
          console.log(
            `[pay/verify] Woo order ${orderId} updated successfully set_paid=true status=on-hold`
          );
        }
      } catch (e) {
        console.error(
          `[pay/verify] Woo update error orderId=${orderId} error=${e instanceof Error ? e.message : String(e)}`
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
      })
    );
  } catch (error) {
    console.error(
      `[pay/verify] unexpected error=${error instanceof Error ? error.message : String(error)}`
    );
    return mapError(error);
  }
}
