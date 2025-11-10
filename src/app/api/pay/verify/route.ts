import { NextResponse } from "next/server";

type VerifyBody = {
  Authority?: string;
  amount?: number;
  currency?: "IRT" | "IRR";
};

function baseURLs() {
  const sandbox = (process.env.ZARINPAL_MODE || "").toLowerCase() !== "production";
  return {
    verify: sandbox
      ? "https://sandbox.zarinpal.com/pg/v4/payment/verify.json"
      : "https://api.zarinpal.com/pg/v4/payment/verify.json",
  };
}

export async function POST(req: Request) {
  try {
    const merchant_id = process.env.ZARINPAL_MERCHANT_ID || "";
    if (!merchant_id) {
      return NextResponse.json({ ok: false, error: "missing_merchant_id" }, { status: 500 });
    }

    const body = (await req.json().catch(() => ({}))) as VerifyBody;
    const authority = String(body?.Authority || "").trim();
    const amount = Math.max(0, Math.floor(Number(body?.amount || 0)));
    if (!authority || !amount) {
      return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
    }

    const { verify } = baseURLs();
    const payload: any = {
      merchant_id,
      authority,
      amount,
      currency: "IRT",
    };
    if (body.currency === "IRR") payload.currency = "IRR";

    const r = await fetch(verify, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const data: any = await r.json().catch(() => ({}));
    const dr = data?.data;
    if (!r.ok || !dr) {
      return NextResponse.json(
        { ok: false, error: "zarinpal_verify_failed", status: r.status, detail: data },
        { status: 502 }
      );
    }

    const code = Number(dr.code);
    const paid = code === 100 || code === 101;

    return NextResponse.json({
      ok: true,
      paid,
      code,
      ref_id: dr?.ref_id,
      card_pan: dr?.card_pan,
      raw: data,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "server_error", detail: String((e as Error)?.message || e) },
      { status: 500 }
    );
  }
}