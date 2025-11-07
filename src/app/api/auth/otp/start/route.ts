// src/app/api/auth/otp/start/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MELIPAYAMAK_OTP_URL = process.env.MELIPAYAMAK_OTP_URL || "";

const OTP_CODE_TTL_SEC = Number(process.env.OTP_CODE_TTL_SEC || 180);
const OTP_ATTEMPT_RATE_PER_HOUR = Number(
  process.env.OTP_ATTEMPT_RATE_PER_HOUR || 3
);

type OtpRec = { code: string; exp: number };
const OTP_STORE: Map<string, OtpRec> =
  (globalThis as any).__KADOCHI_OTP_STORE__ || new Map();
(globalThis as any).__KADOCHI_OTP_STORE__ = OTP_STORE;

type RateRec = { hits: number; resetAt: number };
const RATE_BY_PHONE: Map<string, RateRec> =
  (globalThis as any).__KADOCHI_RATE_PHONE__ || new Map();
const RATE_BY_IP: Map<string, RateRec> =
  (globalThis as any).__KADOCHI_RATE_IP__ || new Map();
(globalThis as any).__KADOCHI_RATE_PHONE__ = RATE_BY_PHONE;
(globalThis as any).__KADOCHI_RATE_IP__ = RATE_BY_IP;

const onlyDigits = (s: string) => String(s || "").replace(/\D+/g, "");
const now = () => Date.now();
function okRate(bucket: Map<string, RateRec>, key: string, limit: number) {
  const hr = 60 * 60 * 1000;
  const rec = bucket.get(key);
  if (!rec || rec.resetAt < now()) {
    bucket.set(key, { hits: 1, resetAt: now() + hr });
    return true;
  }
  if (rec.hits >= limit) return false;
  rec.hits += 1;
  return true;
}

function extractOtpFromResponseBody(text: string): string | null {
  try {
    const j = JSON.parse(text);
    const cand =
      j?.code ?? j?.otp ?? j?.data?.otp ?? j?.data?.code ?? j?.result?.code;
    if (typeof cand === "string") {
      const m = cand.match(/\b(\d{4,6})\b/);
      if (m) return m[1];
    }
    if (typeof cand === "number") {
      const s = String(cand);
      if (/^\d{4,6}$/.test(s)) return s;
    }
    const flat = JSON.stringify(j);
    const m2 = flat.match(/\b(\d{4,6})\b/);
    if (m2) return m2[1];
  } catch {
    const m = text.match(/\b(\d{4,6})\b/);
    if (m) return m[1];
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { phone?: string };
    const phone = onlyDigits(String(body?.phone ?? ""));
    if (!phone) {
      return NextResponse.json(
        { ok: false, error: "INVALID_PHONE" },
        { status: 400 }
      );
    }
    if (!MELIPAYAMAK_OTP_URL) {
      return NextResponse.json(
        { ok: false, error: "MELIPAYAMAK_OTP_URL_NOT_SET" },
        { status: 500 }
      );
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0";
    if (
      !okRate(RATE_BY_PHONE, phone, OTP_ATTEMPT_RATE_PER_HOUR) ||
      !okRate(RATE_BY_IP, ip, OTP_ATTEMPT_RATE_PER_HOUR)
    ) {
      return NextResponse.json(
        { ok: false, error: "RATE_LIMIT" },
        { status: 429 }
      );
    }

    const r = await fetch(MELIPAYAMAK_OTP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ to: phone }),
    });

    const respText = await r.text().catch(() => "");
    if (!r.ok) {
      return NextResponse.json(
        { ok: false, error: "OTP_SEND_FAILED", detail: respText || r.status },
        { status: 502 }
      );
    }

    const providerCode = extractOtpFromResponseBody(respText);
    if (!providerCode) {
      return NextResponse.json(
        { ok: false, error: "PROVIDER_NO_CODE_IN_RESPONSE" },
        { status: 500 }
      );
    }

    OTP_STORE.set(phone, {
      code: providerCode,
      exp: now() + OTP_CODE_TTL_SEC * 1000,
    });

    return NextResponse.json({ ok: true, ttlSec: OTP_CODE_TTL_SEC });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR", detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}
