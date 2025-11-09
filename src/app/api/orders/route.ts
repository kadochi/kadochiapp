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

  if (!url.searchParams.has("_fields")) {
    url.searchParams.set(
      "_fields",
      [
        "id",
        "status",
        "date_created",
        "total",
        "line_items",
        "line_items.name",
        "line_items.product_id",
        "line_items.quantity",
        "line_items.image",
        "line_items.meta_data",
      ].join(",")
    );
  }

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

function extractLineItemImage(li: any): { src: string; alt?: string } | null {
  const direct =
    li?.image?.src ||
    li?.image?.url ||
    li?.image_url ||
    li?.thumbnail ||
    (typeof li?.image === "string" ? li.image : "");
  if (direct) return { src: String(direct), alt: li?.name || "" };

  const metas: any[] = Array.isArray(li?.meta_data) ? li.meta_data : [];
  const m =
    metas.find((m) =>
      String(m?.key || "")
        .toLowerCase()
        .includes("image")
    )?.value || "";
  if (m && typeof m === "string") return { src: m, alt: li?.name || "" };

  return null;
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

  const list = Array.isArray(res.data) ? res.data : [];
  return list.map((o: any) => {
    const items: any[] = Array.isArray(o?.line_items) ? o.line_items : [];
    const patched = items.map((li) => {
      if (li?.image?.src) return li;
      const img = extractLineItemImage(li);
      return img ? { ...li, image: img } : li;
    });
    return { ...o, line_items: patched };
  });
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
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}
