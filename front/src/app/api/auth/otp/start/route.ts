// src/app/api/auth/otp/start/route.ts
import { NextResponse } from "next/server";
import { checkOtpRateLimit, setOtpCode } from "@/lib/otp/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MELIPAYAMAK_OTP_URL = process.env.MELIPAYAMAK_OTP_URL || "";

const OTP_CODE_TTL_SEC = Number(process.env.OTP_CODE_TTL_SEC || 180);
const OTP_ATTEMPT_RATE_PER_HOUR = Number(
  process.env.OTP_ATTEMPT_RATE_PER_HOUR || 3
);

const onlyDigits = (s: string) => String(s || "").replace(/\D+/g, "");

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
  const log = (msg: string, data?: unknown) =>
    console.log(`[otp/start] ${msg}`, data ?? "");

  try {
    const body = (await req.json().catch(() => ({}))) as { phone?: string };
    const phone = onlyDigits(String(body?.phone ?? ""));
    log("request", { body, phone });

    if (!phone) {
      log("response", { ok: false, error: "INVALID_PHONE", status: 400 });
      return NextResponse.json(
        { ok: false, error: "INVALID_PHONE" },
        { status: 400 }
      );
    }
    if (!MELIPAYAMAK_OTP_URL) {
      log("response", {
        ok: false,
        error: "MELIPAYAMAK_OTP_URL_NOT_SET",
        status: 500,
      });
      return NextResponse.json(
        { ok: false, error: "MELIPAYAMAK_OTP_URL_NOT_SET" },
        { status: 500 }
      );
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0";
    const allowed = await checkOtpRateLimit(
      phone,
      ip,
      OTP_ATTEMPT_RATE_PER_HOUR,
    );
    log("rate limit", { ip, allowed, limitPerHour: OTP_ATTEMPT_RATE_PER_HOUR });
    if (!allowed) {
      log("response", { ok: false, error: "RATE_LIMIT", status: 429 });
      return NextResponse.json(
        { ok: false, error: "RATE_LIMIT" },
        { status: 429 }
      );
    }

    const melipayamakRequest = { to: phone };
    log("melipayamak request", {
      endpoint: MELIPAYAMAK_OTP_URL,
      method: "POST",
      body: melipayamakRequest,
    });

    const r = await fetch(MELIPAYAMAK_OTP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify(melipayamakRequest),
    });

    const respText = await r.text().catch(() => "");
    log("melipayamak response", {
      endpoint: MELIPAYAMAK_OTP_URL,
      status: r.status,
      ok: r.ok,
      body: respText,
    });

    if (!r.ok) {
      log("response", {
        ok: false,
        error: "OTP_SEND_FAILED",
        status: 502,
        detail: respText || r.status,
      });
      return NextResponse.json(
        { ok: false, error: "OTP_SEND_FAILED", detail: respText || r.status },
        { status: 502 }
      );
    }

    const providerCode = extractOtpFromResponseBody(respText);
    log("extracted provider code", { providerCode });
    if (!providerCode) {
      log("response", {
        ok: false,
        error: "PROVIDER_NO_CODE_IN_RESPONSE",
        status: 500,
      });
      return NextResponse.json(
        { ok: false, error: "PROVIDER_NO_CODE_IN_RESPONSE" },
        { status: 500 }
      );
    }

    await setOtpCode(phone, providerCode, OTP_CODE_TTL_SEC);
    log("stored otp", {
      phone,
      code: providerCode,
      ttlSec: OTP_CODE_TTL_SEC,
    });

    const success = { ok: true, ttlSec: OTP_CODE_TTL_SEC };
    log("response", { ...success, status: 200 });
    return NextResponse.json(success);
  } catch (e: any) {
    const detail = String(e?.message || e);
    console.log("[otp/start] error", { detail, error: e });
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR", detail },
      { status: 500 }
    );
  }
}
