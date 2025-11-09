// src/app/api/orders/route.ts
import { NextResponse, NextRequest } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function btoaBasic(user: string, pass: string) {
  return "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
}

function onlyDigits(s: string) {
  return s.replace(/\D+/g, "");
}

async function wooFetch<T = any>(path: string) {
  const base = process.env.WP_BASE_URL!;
  const user = process.env.WP_APP_USER!;
  const pass = process.env.WP_APP_PASS!;
  const url = new URL(path, base);

  const r = await fetch(url.toString(), {
    headers: {
      Authorization: btoaBasic(user, pass),
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  let data: any = null;
  try {
    data = await r.json();
  } catch {}
  return { ok: r.ok, status: r.status, data };
}

async function findCustomerIdByPhone(phone: string): Promise<number | null> {
  const norm = onlyDigits(phone);
  const { ok, data } = await wooFetch<any[]>(
    "/wp-json/wc/v3/customers?per_page=50"
  );
  if (!ok || !Array.isArray(data)) return null;
  const hit =
    data.find((c) => onlyDigits(c?.billing?.phone || "") === norm) ?? null;
  return hit?.id ?? null;
}

async function fetchOrdersForCustomer(customerId: number): Promise<any[]> {
  const qs = new URLSearchParams();
  qs.set("customer", String(customerId));
  qs.set("per_page", "50");
  qs.set("orderby", "date");
  qs.set("order", "desc");
  qs.set("status", "any");

  let res = await wooFetch<any[]>(`/wp-json/wc/v3/orders?${qs.toString()}`);

  if (!res.ok && (res.status === 400 || res.status === 404)) {
    const qs2 = new URLSearchParams(qs);
    qs2.delete("status");
    res = await wooFetch<any[]>(`/wp-json/wc/v3/orders?${qs2.toString()}`);
  }

  return Array.isArray(res.data) ? res.data : [];
}

export async function GET(_req: NextRequest) {
  try {
    const sess = await getSessionFromCookies();
    const phone = (sess.phone || "")?.toString().trim() || null;
    const userId = typeof sess.userId === "number" ? sess.userId : null;

    if (!phone && !userId) {
      return NextResponse.json({ ok: false, error: "unauth" }, { status: 401 });
    }

    const customerId =
      userId ?? (phone ? await findCustomerIdByPhone(phone) : null);
    if (!customerId) {
      return NextResponse.json([], { status: 200 });
    }

    const orders = await fetchOrdersForCustomer(customerId);
    return NextResponse.json(orders ?? [], { status: 200 });
  } catch (e) {
    console.error("[/api/orders] error:", e);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}
