// src/app/api/auth/otp/verify/route.ts
import { NextResponse } from "next/server";
import { setSession } from "@/lib/auth/session";
import {
  findCustomers,
  createCustomer,
  updateCustomer,
  type WooCustomer,
} from "@/lib/api/woo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Ephemeral in-memory OTP store (dev/in-memory). This mirrors the legacy
 * behavior to keep the flow unchanged. In production you’d use a durable store.
 */
type OtpRec = { code: string; exp: number };
const OTP_STORE: Map<string, OtpRec> =
  (globalThis as any).__KADOCHI_OTP_STORE__ || new Map();

/** Normalize phone/code to digits only. */
const onlyDigits = (s: string) => String(s || "").replace(/\D+/g, "");

/** Block trivial test codes. */
const BLOCKED_TEST_CODES = new Set(["0000", "1111", "1234", "2222", "9999"]);

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      phone?: string;
      code?: string;
    };

    const phone = onlyDigits(String(body?.phone ?? ""));
    const code = onlyDigits(String(body?.code ?? ""));

    // Basic validation (same as before)
    if (!phone || code.length < 4 || BLOCKED_TEST_CODES.has(code)) {
      return NextResponse.json(
        { ok: false, error: "INVALID_OTP" },
        { status: 400 }
      );
    }

    // Lookup OTP record
    const rec = OTP_STORE.get(phone);
    if (!rec) {
      return NextResponse.json(
        { ok: false, error: "NO_OTP_FOR_PHONE" },
        { status: 400 }
      );
    }
    if (rec.exp < Date.now()) {
      OTP_STORE.delete(phone);
      return NextResponse.json(
        { ok: false, error: "OTP_EXPIRED" },
        { status: 400 }
      );
    }
    if (rec.code !== code) {
      return NextResponse.json(
        { ok: false, error: "INVALID_OTP" },
        { status: 400 }
      );
    }

    // Success: consume OTP exactly like before
    OTP_STORE.delete(phone);

    // Ensure Woo customer by phone (create or update)
    const { id, firstName, lastName, displayName, normalizedPhone } =
      await ensureWooCustomerByPhone(phone);

    // Set session cookie (30-day lifetime is configured in the session helper)
    await setSession(id, {
      phone: normalizedPhone,
      firstName: firstName ?? null,
      lastName: lastName ?? null,
      name: displayName ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "INVALID_OTP" },
      { status: 400 }
    );
  }
}

/**
 * Make sure there is a Woo customer for the provided phone number.
 * - If none exists, create one.
 * - If exists but missing phone in billing, update it.
 * Returns normalized identity fields to feed into the session payload.
 */
async function ensureWooCustomerByPhone(phoneRaw: string): Promise<{
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  normalizedPhone: string;
}> {
  const digits = onlyDigits(phoneRaw);

  // Search Woo customers
  const list = await findCustomers({ search: digits }).catch(
    () => [] as WooCustomer[]
  );
  let c: WooCustomer | undefined = list?.[0];

  // Create if not found
  if (!c) {
    const fallbackEmail = `${digits}@kadochi.local`;

    c = await createCustomer({
      username: digits,
      email: fallbackEmail,
      first_name: "",
      last_name: "",
      billing: { phone: digits, email: fallbackEmail },
    });
  }
  // Patch missing phone if needed
  else if (!c.billing?.phone) {
    try {
      c = await updateCustomer(c.id, {
        billing: { ...(c.billing || {}), phone: digits },
      });
    } catch {
      // non-fatal
    }
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
