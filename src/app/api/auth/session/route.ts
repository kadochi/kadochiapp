import { NextResponse } from "next/server";
import {
  getSessionFromCookies,
  setSession, // persist enriched fields back to cookie
} from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Prefer the unified Woo helper. If the module isn't available,
 * fall back to a raw REST call (keeps legacy behavior intact).
 */
let getCustomerById: ((id: number) => Promise<any>) | undefined;
try {
  getCustomerById = require("@/lib/api/woo").getCustomerById;
} catch {}

/**
 * Raw fallback that calls Woo REST directly with consumer key/secret.
 * Best-effort and non-fatal: returns null on any failure.
 */
async function fallbackGetCustomerById(id: number) {
  try {
    const base = process.env.WOO_BASE_URL || process.env.WP_BASE_URL;
    const key = process.env.WOO_CONSUMER_KEY;
    const sec = process.env.WOO_CONSUMER_SECRET;
    if (!base || !key || !sec) return null;

    const url =
      `${base.replace(/\/$/, "")}/wp-json/wc/v3/customers/${id}` +
      `?consumer_key=${encodeURIComponent(key)}` +
      `&consumer_secret=${encodeURIComponent(sec)}`;

    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

/**
 * Compute display name with the exact requested priority:
 *   (firstName + lastName) > phone
 */
function buildDisplayName(
  firstName?: string | null,
  lastName?: string | null,
  phone?: string | null
) {
  const first = (firstName || "").trim();
  const last = (lastName || "").trim();
  const full = [first, last].filter(Boolean).join(" ").trim();
  return full || (phone || "").trim() || null;
}

export async function GET() {
  const noStore: HeadersInit = {
    "Cache-Control": "no-store, no-cache, must-revalidate",
    Pragma: "no-cache",
  };

  // Read the cookie-backed session (may be partial)
  const base = await getSessionFromCookies();

  // Not logged in
  if (!base?.userId) {
    return NextResponse.json({ session: null }, { headers: noStore });
  }

  // Seed with whatever we already have
  let first: string | null = base.firstName ?? null;
  let last: string | null = base.lastName ?? null;
  let phone: string | null = base.phone ?? null;

  // Enrich from Woo only when needed (avoids extra calls)
  if ((!first && !last) || !phone) {
    try {
      const fetcher =
        getCustomerById ??
        (async (id: number) => await fallbackGetCustomerById(id));

      const c = await fetcher(base.userId);
      if (c) {
        first =
          (c?.first_name || c?.billing?.first_name || first || null)?.trim() ||
          null;
        last =
          (c?.last_name || c?.billing?.last_name || last || null)?.trim() ||
          null;
        phone = (c?.billing?.phone || phone || null)?.trim() || null;

        // Persist enriched fields to the cookie (name is intentionally null;
        // we don't want it to override the display priority).
        await setSession(base.userId, {
          firstName: first,
          lastName: last,
          phone,
          name: null,
        });
      }
    } catch {
      // Swallow enrichment errors; the page can still render with cookie data.
    }
  }

  // Build display name with the required priority
  const displayName = buildDisplayName(first, last, phone);

  // Return the normalized session shape (keep `name: null` by design)
  return NextResponse.json(
    {
      session: {
        userId: base.userId,
        firstName: first,
        lastName: last,
        phone,
        name: null, // keep null to enforce (first+last) > phone in UI
        displayName, // optional helper for clients (non-breaking)
      },
    },
    { headers: noStore }
  );
}
