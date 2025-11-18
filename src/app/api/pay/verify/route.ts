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

    if (!authority || !Number.isFinite(amount) || amount <= 0) {
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

    if (result.paid && orderId) {
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

        const res = await wordpressFetch(`/wp-json/wc/v3/orders/${orderId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify(updatePayload),
          timeoutMs: 8_000,
        });

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          console.error(
            "[api/pay/verify] failed to update Woo order",
            res.status,
            txt
          );
        }
      } catch (e) {
        console.error("[api/pay/verify] Woo update error", e);
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
    return mapError(error);
  }
}
