// src/app/api/auth/otp/start/route.ts
import { NextResponse } from "next/server";
import { checkOtpRateLimit, setOtpCode } from "@/lib/otp/store";
import {
  isDevBypassPhone,
  OTP_DEV_BYPASS_CODE,
} from "@/app/api/auth/otp/_lib/dev-bypass";
import {
  createOtpLogger,
  failResponse,
  maskPhone,
} from "@/app/api/auth/otp/_lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MELIPAYAMAK_OTP_URL = process.env.MELIPAYAMAK_OTP_URL || "";

const OTP_CODE_TTL_SEC = Number(process.env.OTP_CODE_TTL_SEC || 180);
const OTP_ATTEMPT_RATE_PER_HOUR = Number(
  process.env.OTP_ATTEMPT_RATE_PER_HOUR || 3,
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
  const log = createOtpLogger("start");

  try {
    const body = (await req.json().catch(() => ({}))) as { phone?: string };
    const phone = onlyDigits(String(body?.phone ?? ""));
    log.info("request", { phone: maskPhone(phone) });

    if (!phone) {
      return failResponse(
        log,
        "INVALID_PHONE",
        "Phone number is missing or invalid",
        400,
      );
    }
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0";

    let allowed: boolean;
    try {
      allowed = await checkOtpRateLimit(
        phone,
        ip,
        OTP_ATTEMPT_RATE_PER_HOUR,
      );
    } catch (cause) {
      return failResponse(
        log,
        "REDIS_ERROR",
        "Rate limit check failed",
        503,
        { ip, phone: maskPhone(phone) },
        cause,
      );
    }

    log.info("rate_limit", {
      ip,
      allowed,
      limitPerHour: OTP_ATTEMPT_RATE_PER_HOUR,
      phone: maskPhone(phone),
    });
    if (!allowed) {
      return failResponse(
        log,
        "RATE_LIMIT",
        "OTP attempt rate limit exceeded",
        429,
        { ip, phone: maskPhone(phone) },
      );
    }

    if (isDevBypassPhone(phone)) {
      log.info("dev_bypass", { phone: maskPhone(phone) });
      try {
        await setOtpCode(phone, OTP_DEV_BYPASS_CODE, OTP_CODE_TTL_SEC);
      } catch (cause) {
        return failResponse(
          log,
          "REDIS_ERROR",
          "Failed to store OTP code",
          503,
          { phone: maskPhone(phone), ttlSec: OTP_CODE_TTL_SEC },
          cause,
        );
      }
      log.info("response", { ok: true, status: 200, ttlSec: OTP_CODE_TTL_SEC });
      return NextResponse.json({
        ok: true,
        ttlSec: OTP_CODE_TTL_SEC,
        requestId: log.requestId,
      });
    }

    if (!MELIPAYAMAK_OTP_URL) {
      return failResponse(
        log,
        "MELIPAYAMAK_OTP_URL_NOT_SET",
        "MELIPAYAMAK_OTP_URL env var is not configured",
        500,
      );
    }

    const melipayamakRequest = { to: phone };
    log.info("melipayamak_request", {
      endpoint: MELIPAYAMAK_OTP_URL,
      method: "POST",
      phone: maskPhone(phone),
    });

    let r: Response;
    try {
      r = await fetch(MELIPAYAMAK_OTP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(melipayamakRequest),
      });
    } catch (cause) {
      return failResponse(
        log,
        "PROVIDER_NETWORK_ERROR",
        "Melipayamak request failed",
        502,
        { endpoint: MELIPAYAMAK_OTP_URL, phone: maskPhone(phone) },
        cause,
      );
    }

    const respText = await r.text().catch(() => "");
    log.info("melipayamak_response", {
      endpoint: MELIPAYAMAK_OTP_URL,
      status: r.status,
      ok: r.ok,
      bodyLength: respText.length,
    });

    if (!r.ok) {
      return failResponse(
        log,
        "OTP_SEND_FAILED",
        "Melipayamak returned a non-success status",
        502,
        {
          endpoint: MELIPAYAMAK_OTP_URL,
          phone: maskPhone(phone),
          providerStatus: r.status,
        },
        undefined,
        { detail: respText || String(r.status) },
      );
    }

    const providerCode = extractOtpFromResponseBody(respText);
    log.info("provider_code_extracted", {
      phone: maskPhone(phone),
      extracted: !!providerCode,
    });
    if (!providerCode) {
      return failResponse(
        log,
        "PROVIDER_NO_CODE_IN_RESPONSE",
        "No OTP code found in Melipayamak response",
        502,
        {
          endpoint: MELIPAYAMAK_OTP_URL,
          phone: maskPhone(phone),
          bodyPreview: respText.slice(0, 200),
        },
      );
    }

    try {
      await setOtpCode(phone, providerCode, OTP_CODE_TTL_SEC);
    } catch (cause) {
      return failResponse(
        log,
        "REDIS_ERROR",
        "Failed to store OTP code",
        503,
        { phone: maskPhone(phone), ttlSec: OTP_CODE_TTL_SEC },
        cause,
      );
    }

    log.info("otp_stored", {
      phone: maskPhone(phone),
      ttlSec: OTP_CODE_TTL_SEC,
    });

    log.info("response", { ok: true, status: 200, ttlSec: OTP_CODE_TTL_SEC });
    return NextResponse.json({
      ok: true,
      ttlSec: OTP_CODE_TTL_SEC,
      requestId: log.requestId,
    });
  } catch (cause) {
    return failResponse(
      log,
      "SERVER_ERROR",
      "Unhandled exception during OTP start",
      500,
      undefined,
      cause,
    );
  }
}
