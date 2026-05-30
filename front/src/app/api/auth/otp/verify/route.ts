// src/app/api/auth/otp/verify/route.ts
import { NextResponse } from "next/server";
import { setSession } from "@/lib/auth/session";
import {
  findCustomers,
  createCustomer,
  updateCustomer,
  type WooCustomer,
} from "@/lib/api/woo";
import { deleteOtpCode, getOtpCode } from "@/lib/otp/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Normalize phone/code to digits only. */
const onlyDigits = (s: string) => String(s || "").replace(/\D+/g, "");

/** Block trivial test codes. */
const BLOCKED_TEST_CODES = new Set(["0000", "1111", "1234", "2222", "9999"]);

export async function POST(req: Request) {
  const log = (msg: string, data?: unknown) =>
    console.log(`[otp/verify] ${msg}`, data ?? "");

  try {
    const body = (await req.json().catch(() => ({}))) as {
      phone?: string;
      code?: string;
    };

    const phone = onlyDigits(String(body?.phone ?? ""));
    const code = onlyDigits(String(body?.code ?? ""));
    log("request", { body, phone, code });

    // Basic validation (same as before)
    if (!phone || code.length < 4 || BLOCKED_TEST_CODES.has(code)) {
      log("response", { ok: false, error: "INVALID_OTP", status: 400 });
      return NextResponse.json(
        { ok: false, error: "INVALID_OTP" },
        { status: 400 },
      );
    }

    const storedCode = await getOtpCode(phone);
    log("stored otp", { phone, storedCode });
    if (!storedCode) {
      log("response", { ok: false, error: "NO_OTP_FOR_PHONE", status: 400 });
      return NextResponse.json(
        { ok: false, error: "NO_OTP_FOR_PHONE" },
        { status: 400 },
      );
    }
    if (storedCode !== code) {
      log("otp mismatch", { phone, submitted: code, stored: storedCode });
      log("response", { ok: false, error: "INVALID_OTP", status: 400 });
      return NextResponse.json(
        { ok: false, error: "INVALID_OTP" },
        { status: 400 },
      );
    }

    log("otp matched", { phone, code });
    await deleteOtpCode(phone);
    log("deleted stored otp", { phone });

    // Ensure Woo customer by phone (create or update)
    const { id, firstName, lastName, displayName, normalizedPhone } =
      await ensureWooCustomerByPhone(phone, log);

    const sessionPayload = {
      phone: normalizedPhone,
      firstName: firstName ?? null,
      lastName: lastName ?? null,
      name: displayName ?? null,
    };
    log("setSession", { customerId: id, sessionPayload });
    await setSession(id, sessionPayload);

    log("response", { ok: true, status: 200, customerId: id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.log("[otp/verify] error", {
      error: e,
      message: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json(
      { ok: false, error: "INVALID_OTP" },
      { status: 400 },
    );
  }
}

/**
 * Make sure there is a Woo customer for the provided phone number.
 * - If none exists, create one.
 * - If exists but missing phone in billing, update it.
 * Returns normalized identity fields to feed into the session payload.
 */
type OtpVerifyLog = (msg: string, data?: unknown) => void;

async function ensureWooCustomerByPhone(
  phoneRaw: string,
  log: OtpVerifyLog,
): Promise<{
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  normalizedPhone: string;
}> {
  const digits = onlyDigits(phoneRaw);

  const findEndpoint = `/wp-json/wc/v3/customers?search=${encodeURIComponent(digits)}`;
  log("woo findCustomers request", {
    endpoint: findEndpoint,
    method: "GET",
    params: { search: digits },
  });

  const list = await findCustomers({ search: digits }).catch((err) => {
    log("woo findCustomers error", { endpoint: findEndpoint, error: err });
    return [] as WooCustomer[];
  });
  log("woo findCustomers response", {
    endpoint: findEndpoint,
    count: list?.length ?? 0,
    customers: list,
  });

  let c: WooCustomer | undefined = list?.[0];

  // Create if not found
  if (!c) {
    const createEndpoint = "/wp-json/wc/v3/customers";
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
    log("woo createCustomer request", {
      endpoint: createEndpoint,
      method: "POST",
      body: createBody,
    });

    c = await createCustomer(createBody);
    log("woo createCustomer response", {
      endpoint: createEndpoint,
      customer: c,
    });
  }
  // Patch missing phone if needed
  else if (!c.billing?.phone) {
    const updateEndpoint = `/wp-json/wc/v3/customers/${c.id}`;
    const updateBody = {
      billing: { ...(c.billing || {}), phone: digits },
    };
    log("woo updateCustomer request", {
      endpoint: updateEndpoint,
      method: "PUT",
      body: updateBody,
    });
    try {
      c = await updateCustomer(c.id, updateBody);
      log("woo updateCustomer response", {
        endpoint: updateEndpoint,
        customer: c,
      });
    } catch (err) {
      log("woo updateCustomer error", { endpoint: updateEndpoint, error: err });
      // non-fatal
    }
  } else {
    log("woo customer found", { customerId: c.id, customer: c });
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
