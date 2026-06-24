// src/app/api/auth/otp/verify/route.ts
import { NextResponse } from "next/server";
import {
  applySessionCookie,
  buildSessionCookie,
} from "@/modules/auth/services/session";
import {
  findCustomers,
  createCustomer,
  updateCustomer,
  getWooCredentialSnapshot,
  resolveWooUrl,
  type WooCustomer,
} from "@/lib/api/woo";
import { deleteOtpCode, getOtpCode } from "@/modules/auth/services/otp.server";
import {
  isBlockedTestCode,
  isDevBypassLogin,
} from "@/app/api/auth/otp/_lib/dev-bypass";
import {
  createOtpLogger,
  failResponse,
  maskCode,
  maskPhone,
  type OtpLogger,
} from "@/app/api/auth/otp/_lib/logger";
import { UpstreamAuthError } from "@/services/http/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Normalize phone/code to digits only. */
const onlyDigits = (s: string) => String(s || "").replace(/\D+/g, "");

export async function POST(req: Request) {
  const log = createOtpLogger("verify");
  let phone = "";

  try {
    const body = (await req.json().catch(() => ({}))) as {
      phone?: string;
      code?: string;
    };

    phone = onlyDigits(String(body?.phone ?? ""));
    const code = onlyDigits(String(body?.code ?? ""));
    log.info("request", {
      phone: maskPhone(phone),
      codeLength: code.length,
    });

    if (!phone || code.length < 4 || isBlockedTestCode(code, phone)) {
      return failResponse(
        log,
        "INVALID_OTP",
        "Phone or code is missing, too short, or blocked",
        400,
        { phone: maskPhone(phone), codeLength: code.length },
      );
    }

    const devBypass = isDevBypassLogin(phone, code);

    if (devBypass) {
      log.info("dev_bypass", { phone: maskPhone(phone) });
    } else {
      let storedCode: string | null;
      try {
        storedCode = await getOtpCode(phone);
      } catch (cause) {
        return failResponse(
          log,
          "REDIS_ERROR",
          "Failed to read stored OTP",
          503,
          { phone: maskPhone(phone) },
          cause,
        );
      }

      log.info("stored_otp_lookup", {
        phone: maskPhone(phone),
        found: !!storedCode,
      });
      if (!storedCode) {
        return failResponse(
          log,
          "NO_OTP_FOR_PHONE",
          "No active OTP found for phone",
          400,
          { phone: maskPhone(phone) },
        );
      }
      if (storedCode !== code) {
        log.warn("otp_mismatch", {
          phone: maskPhone(phone),
          submitted: maskCode(code),
          stored: maskCode(storedCode),
        });
        return failResponse(
          log,
          "INVALID_OTP",
          "Submitted code does not match stored OTP",
          400,
          { phone: maskPhone(phone) },
        );
      }

      try {
        await deleteOtpCode(phone);
      } catch (cause) {
        return failResponse(
          log,
          "REDIS_ERROR",
          "Failed to delete OTP after verification",
          503,
          { phone: maskPhone(phone) },
          cause,
        );
      }

      log.info("otp_deleted", { phone: maskPhone(phone) });
    }

    log.info("otp_matched", { phone: maskPhone(phone) });

    const { id, firstName, lastName, displayName, normalizedPhone } =
      await ensureWooCustomerByPhone(phone, log);

    const sessionPayload = {
      phone: normalizedPhone,
      firstName: firstName ?? null,
      lastName: lastName ?? null,
      name: displayName ?? null,
    };
    log.info("set_session", {
      customerId: id,
      phone: maskPhone(normalizedPhone),
    });

    let sessionCookie;
    try {
      sessionCookie = await buildSessionCookie(id, sessionPayload);
    } catch (cause) {
      return failResponse(
        log,
        "SESSION_SET_FAILED",
        "Failed to build session cookie",
        500,
        { customerId: id, phone: maskPhone(normalizedPhone) },
        cause,
      );
    }

    const response = NextResponse.json({
      ok: true,
      requestId: log.requestId,
    });
    applySessionCookie(response, sessionCookie);

    log.info("response", { ok: true, status: 200, customerId: id });
    return response;
  } catch (cause) {
    if (cause instanceof OtpRouteError) {
      return failResponse(
        log,
        cause.code,
        cause.reason,
        cause.status,
        { phone: maskPhone(phone), ...cause.ctx },
        cause.cause,
      );
    }
    return failResponse(
      log,
      "SERVER_ERROR",
      "Unhandled exception during OTP verify",
      500,
      { phone: maskPhone(phone) },
      cause,
    );
  }
}

class OtpRouteError extends Error {
  constructor(
    readonly code:
      | "WOO_LOOKUP_FAILED"
      | "WOO_CREATE_FAILED"
      | "WOO_UPDATE_FAILED",
    readonly reason: string,
    readonly status: number,
    readonly ctx?: Record<string, unknown>,
    readonly cause?: unknown,
  ) {
    super(reason);
    this.name = "OtpRouteError";
  }
}

/**
 * Make sure there is a Woo customer for the provided phone number.
 * - If none exists, create one.
 * - If exists but missing phone in billing, update it.
 * Returns normalized identity fields to feed into the session payload.
 */
async function ensureWooCustomerByPhone(
  phoneRaw: string,
  log: OtpLogger,
): Promise<{
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  normalizedPhone: string;
}> {
  const digits = onlyDigits(phoneRaw);
  const wooKeys = getWooCredentialSnapshot();

  const findPath = `/wp-json/wc/v3/customers?search=${encodeURIComponent(digits)}`;
  const findEndpoint = resolveWooUrl(findPath);
  log.info("woo_config", {
    consumerKey: wooKeys.consumerKey,
    consumerSecret: wooKeys.consumerSecret,
  });
  log.info("woo_find_customers_request", {
    endpoint: findEndpoint,
    consumerKey: wooKeys.consumerKey,
    consumerSecret: wooKeys.consumerSecret,
    phone: maskPhone(digits),
  });

  let list: WooCustomer[];
  try {
    list = await findCustomers({ search: digits });
  } catch (cause) {
    const reason =
      cause instanceof UpstreamAuthError
        ? "WooCommerce REST credentials rejected or lack customer read permission"
        : "WooCommerce customer search failed";
    throw new OtpRouteError(
      "WOO_LOOKUP_FAILED",
      reason,
      502,
      {
        endpoint: findEndpoint,
        consumerKey: wooKeys.consumerKey,
        consumerSecret: wooKeys.consumerSecret,
        phone: maskPhone(digits),
      },
      cause,
    );
  }

  log.info("woo_find_customers_response", {
    endpoint: findEndpoint,
    count: list?.length ?? 0,
    customerIds: list?.map((c) => c.id) ?? [],
  });

  let c: WooCustomer | undefined = list?.[0];

  if (!c) {
    const createPath = "/wp-json/wc/v3/customers";
    const createEndpoint = resolveWooUrl(createPath);
    const createBody = {
      username: digits,
      email: `${digits}@kadochi.local`,
      first_name: "",
      last_name: "",
      billing: {
        phone: digits,
        email: `${digits}@kadochi.local`,
      },
    };
    log.info("woo_create_customer_request", {
      endpoint: createEndpoint,
      consumerKey: wooKeys.consumerKey,
      consumerSecret: wooKeys.consumerSecret,
      phone: maskPhone(digits),
    });

    try {
      c = await createCustomer(createBody);
    } catch (cause) {
      throw new OtpRouteError(
        "WOO_CREATE_FAILED",
        "WooCommerce customer creation failed",
        502,
        {
          endpoint: createEndpoint,
          consumerKey: wooKeys.consumerKey,
          consumerSecret: wooKeys.consumerSecret,
          phone: maskPhone(digits),
        },
        cause,
      );
    }

    log.info("woo_create_customer_response", {
      endpoint: createEndpoint,
      customerId: c.id,
    });
  } else if (!c.billing?.phone) {
    const updatePath = `/wp-json/wc/v3/customers/${c.id}`;
    const updateEndpoint = resolveWooUrl(updatePath);
    const updateBody = {
      billing: { ...(c.billing || {}), phone: digits },
    };
    log.info("woo_update_customer_request", {
      endpoint: updateEndpoint,
      consumerKey: wooKeys.consumerKey,
      consumerSecret: wooKeys.consumerSecret,
      customerId: c.id,
      phone: maskPhone(digits),
    });
    try {
      c = await updateCustomer(c.id, updateBody);
      log.info("woo_update_customer_response", {
        endpoint: updateEndpoint,
        customerId: c.id,
      });
    } catch (cause) {
      log.warn("woo_update_customer_error", {
        endpoint: updateEndpoint,
        customerId: c.id,
        cause: cause instanceof Error ? cause.message : String(cause),
      });
      // non-fatal: customer exists, phone patch is best-effort
    }
  } else {
    log.info("woo_customer_found", { customerId: c.id });
  }

  const first = c?.first_name?.trim() || c?.billing?.first_name?.trim() || null;
  const last = c?.last_name?.trim() || c?.billing?.last_name?.trim() || null;
  const dn = [first || "", last || ""].join(" ").trim() || null;

  return {
    id: c.id,
    firstName: first,
    lastName: last,
    displayName: dn,
    normalizedPhone: digits,
  };
}
