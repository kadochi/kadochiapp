// src/app/api/orders/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getOrderDetailForSession } from "@/lib/api/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Ctx = { params: Promise<{ id: string }> };

function noStore<T>(res: NextResponse<T>) {
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("Vary", "Cookie");
  return res;
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const orderId = (id || "").trim();

    if (!orderId) {
      return noStore(
        NextResponse.json({ ok: false, error: "bad_id" }, { status: 400 })
      );
    }

    const detail = await getOrderDetailForSession(orderId);
    if (!detail) {
      return noStore(NextResponse.json({}, { status: 404 }));
    }

    return noStore(NextResponse.json(detail, { status: 200 }));
  } catch (err: any) {
    const status = Number(err?.status) || 500;

    const make = (body: any, code: number) =>
      noStore(NextResponse.json(body, { status: code }));

    if (status === 400) return make({ ok: false, error: "bad_id" }, status);
    if (status === 401)
      return make({ ok: false, error: "unauthorized" }, status);
    if (status === 403) return make({ ok: false, error: "forbidden" }, status);
    if (status === 404) return make({}, status);
    if (status === 502)
      return make({ ok: false, error: "upstream_error" }, status);
    if (status === 504)
      return make({ ok: false, error: "upstream_timeout" }, status);

    return make({ ok: false, error: "server_error" }, 500);
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const orderId = (id || "").trim();

  if (!orderId) {
    return noStore(
      NextResponse.json({ ok: false, error: "bad_id" }, { status: 400 })
    );
  }

  const body = (await req.json().catch(() => ({} as any))) as {
    ref_id?: string | number;
    card_pan?: string;
  };

  console.log("[api/orders] payment meta", { orderId, body });

  try {
    const updatePayload = {
      status: "on-hold",
      set_paid: true,
    };

    await fetch(`/api/wp/wp-json/wc/v3/orders/${orderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify(updatePayload),
    }).catch((err) => {
      console.error("[api/orders] failed to update Woo order", err);
    });
  } catch (e) {
    console.error("[api/orders] Woo update error", e);
  }

  return noStore(NextResponse.json({ ok: true }, { status: 200 }));
}
