import { NextResponse } from "next/server";

type StartBody = {
  amount: number;
  description?: string;
  email?: string;
  mobile?: string;
  orderId?: string | number;
  currency?: "IRT" | "IRR";
};

function baseURLs() {
  const sandbox = (process.env.ZARINPAL_MODE || "").toLowerCase() !== "production";
  return {
    request: sandbox
      ? "https://sandbox.zarinpal.com/pg/v4/payment/request.json"
      : "https://api.zarinpal.com/pg/v4/payment/request.json",
    startPay: sandbox
      ? "https://sandbox.zarinpal.com/pg/StartPay/"
      : "https://www.zarinpal.com/pg/StartPay/",
  };
}

function isBadCallback(u?: string) {
  if (!u) return true;
  try {
    const host = new URL(u).hostname;
    return !host || /your\.site/i.test(host);
  } catch {
    return true;
  }
}

function resolveCallbackUrl(req: Request) {
  const envCb = process.env.ZARINPAL_CALLBACK_URL || "";
  if (!isBadCallback(envCb)) return envCb;
  const origin = new URL(req.url).origin;
  return `${origin}/checkout/zp-callback`;
}

export async function POST(req: Request) {
  try {
    const merchant_id = process.env.ZARINPAL_MERCHANT_ID || "";
    if (!merchant_id) {
      return NextResponse.json({ ok: false, error: "missing_merchant_id" }, { status: 500 });
    }

    const body = (await req.json().catch(() => ({}))) as StartBody;
    const amount = Math.max(0, Math.floor(Number(body.amount || 0)));
    if (!amount) {
      return NextResponse.json({ ok: false, error: "invalid_amount" }, { status: 400 });
    }

    const { request, startPay } = baseURLs();
    const callback_url = resolveCallbackUrl(req);

    const payload: any = {
      merchant_id,
      amount,
      callback_url,
      description: body.description || `پرداخت سفارش ${body.orderId ?? ""}`,
      metadata: {
        order_id: body.orderId ? String(body.orderId) : undefined,
        email: body.email || undefined,
        mobile: (body.mobile || "").replace(/\D+/g, "") || undefined,
      },
      currency: "IRT",
    };

    if (body.currency === "IRR") payload.currency = "IRR";

    const r = await fetch(request, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const data: any = await r.json().catch(() => ({}));
    const dr = data?.data;
    if (!r.ok || !dr?.authority) {
      return NextResponse.json(
        { ok: false, error: "zarinpal_request_failed", status: r.status, detail: data },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      authority: dr.authority,
      url: `${startPay}${dr.authority}`,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "server_error", detail: String((e as Error)?.message || e) },
      { status: 500 }
    );
  }
}