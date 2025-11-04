// src/app/api/auth/session/route.ts
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session";

let getCustomerById: ((id: number) => Promise<any>) | undefined;
try {
  getCustomerById = require("@/lib/api/woo").getCustomerById;
} catch {}

async function fallbackGetCustomerById(id: number) {
  try {
    const base = process.env.WOO_BASE_URL || process.env.WP_BASE_URL;
    const key = process.env.WOO_CONSUMER_KEY;
    const sec = process.env.WOO_CONSUMER_SECRET;
    if (!base || !key || !sec) return null;

    const url = `${base.replace(
      /\/$/,
      ""
    )}/wp-json/wc/v3/customers/${id}?consumer_key=${encodeURIComponent(
      key
    )}&consumer_secret=${encodeURIComponent(sec)}`;

    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const base = await getSessionFromCookies();

  if (!base.userId) {
    return NextResponse.json(
      { session: null },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  let first: string | null = base.firstName ?? null;
  let last: string | null = base.lastName ?? null;
  let phone: string | null = base.phone ?? null;

  try {
    const fetcher =
      getCustomerById ??
      (async (id: number) => await fallbackGetCustomerById(id));
    const c = await fetcher(base.userId);

    if (c) {
      first =
        c?.first_name?.trim() ||
        c?.billing?.first_name?.trim() ||
        first ||
        null;
      last =
        c?.last_name?.trim() || c?.billing?.last_name?.trim() || last || null;
      phone = c?.billing?.phone?.trim() || phone || null;
    }
  } catch {}

  const name =
    [first || "", last || ""].join(" ").trim() || (base.name?.trim() ?? null);

  return NextResponse.json(
    {
      session: {
        userId: base.userId,
        name,
        firstName: first,
        lastName: last,
        phone,
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
