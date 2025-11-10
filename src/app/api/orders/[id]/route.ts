// src/app/api/orders/[orderId]/route.ts
// Order detail API — auth-safe caching, proper errors, solid params typing.

import { NextResponse } from "next/server";
import { getOrderDetailForSession } from "@/lib/api/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: { orderId?: string; id?: string } };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const orderId = String(ctx.params.orderId ?? ctx.params.id ?? "").trim();
    if (!orderId) {
      return NextResponse.json({ ok: false, error: "bad_id" }, { status: 400 });
    }

    const detail = await getOrderDetailForSession(orderId);
    if (!detail) {
      return NextResponse.json({}, { status: 404 });
    }

    // Auth-aware caching: only browser cache, never CDN share.
    const res = NextResponse.json(detail, { status: 200 });
    res.headers.set(
      "Cache-Control",
      "private, max-age=20, stale-while-revalidate=60"
    );
    res.headers.set("Vary", "Cookie");
    return res;
  } catch (err: any) {
    const status = Number(err?.status) || 500;

    if (status === 400)
      return NextResponse.json({ ok: false, error: "bad_id" }, { status });
    if (status === 401)
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status }
      );
    if (status === 403)
      return NextResponse.json({ ok: false, error: "forbidden" }, { status });
    if (status === 404) return NextResponse.json({}, { status });
    if (status === 502)
      return NextResponse.json(
        { ok: false, error: "upstream_error" },
        { status }
      );
    if (status === 504)
      return NextResponse.json(
        { ok: false, error: "upstream_timeout" },
        { status }
      );

    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}
