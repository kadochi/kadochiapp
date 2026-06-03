import { NextRequest, NextResponse } from "next/server";

import {
  UpstreamBadResponse,
  UpstreamNetworkError,
  UpstreamTimeout,
} from "@/services/http/errors";
import { requestPayment } from "@/services/payment/zarinpal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StartBody = {
  amount: number;
  description?: string;
  email?: string;
  mobile?: string;
  orderId?: string | number;
  currency?: "IRT" | "IRR";
};

function isBadCallback(u?: string | null) {
  if (!u) return true;
  try {
    const host = new URL(u).hostname;
    return !host || /your\.site/i.test(host);
  } catch {
    return true;
  }
}

function resolveCallbackUrl(req: NextRequest) {
  const envCb = process.env.ZARINPAL_CALLBACK_URL || "";
  if (!isBadCallback(envCb)) return envCb;
  const origin = new URL(req.url).origin;
  return `${origin}/checkout/zp-callback`;
}

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
    if (error.status === 400 && error.message === "invalid_amount") {
      return noStore(
        NextResponse.json({ ok: false, error: "invalid_amount" }, { status: 400 })
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
    if (error.status === 400 && error.message === "invalid_callback_url") {
      return noStore(
        NextResponse.json(
          { ok: false, error: "invalid_callback_url" },
          { status: 400 }
        )
      );
    }
    const status = error.status >= 400 ? error.status : 502;
    return noStore(
      NextResponse.json(
        { ok: false, error: "zarinpal_request_failed", status },
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
    const body = (await req.json().catch(() => ({}))) as StartBody;
    const callbackUrl = resolveCallbackUrl(req);

    console.log(
      `[pay/start] request amount=${body.amount} currency=${body.currency} orderId=${body.orderId} description=${body.description} callbackUrl=${callbackUrl} mobile=${body.mobile ? body.mobile.slice(0, 4) + "***" : "N/A"}`
    );

    const result = await requestPayment(
      {
        amount: body.amount,
        description: body.description,
        email: body.email,
        mobile: body.mobile,
        orderId: body.orderId,
        currency: body.currency,
        callbackUrl,
      },
      { timeoutMs: 8_000 }
    );

    console.log(
      `[pay/start] success authority=${result.authority} paymentUrl=${result.url} code=${result.code}`
    );

    return noStore(
      NextResponse.json({
        ok: true,
        authority: result.authority,
        url: result.url,
      })
    );
  } catch (error) {
    console.error(
      `[pay/start] failed error=${error instanceof Error ? error.message : String(error)}`
    );
    return mapError(error);
  }
}