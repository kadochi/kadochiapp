// src/app/api/orders/[id]/route.ts
// Order detail API

import { NextRequest, NextResponse } from "next/server";
import { getOrderDetailForSession } from "@/lib/api/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const orderId = (id || "").trim();

    if (!orderId) {
      return NextResponse.json({ ok: false, error: "bad_id" }, { status: 400 });
    }

    const detail = await getOrderDetailForSession(orderId);
    if (!detail) {
      return NextResponse.json({}, { status: 404 });
    }

    const res = NextResponse.json(detail, { status: 200 });
    res.headers.set(
      "Cache-Control",
      "private, max-age=20, stale-while-revalidate=60"
    );
    res.headers.set("Vary", "Cookie");
    return res;
  } catch (err: any) {
    const status = Number(err?.status) || 500;

    if (status === 400) {
      return NextResponse.json({ ok: false, error: "bad_id" }, { status });
    }
    if (status === 401) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status }
      );
    }
    if (status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status });
    }
    if (status === 404) {
      return NextResponse.json({}, { status });
    }
    if (status === 502) {
      return NextResponse.json(
        { ok: false, error: "upstream_error" },
        { status }
      );
    }
    if (status === 504) {
      return NextResponse.json(
        { ok: false, error: "upstream_timeout" },
        { status }
      );
    }

    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}
