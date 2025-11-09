import { NextRequest, NextResponse } from "next/server";
import { getOrderDetailForSession } from "@/lib/api/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ orderId?: string; id?: string }> }
) {
  try {
    const p = await ctx.params;
    const orderId = (p.orderId ?? p.id ?? "").trim();
    if (!orderId) {
      return NextResponse.json({ ok: false, error: "bad_id" }, { status: 400 });
    }

    const detail = await getOrderDetailForSession(orderId);
    if (!detail) {
      return NextResponse.json({}, { status: 404 });
    }

    const res = NextResponse.json(detail, { status: 200 });
    res.headers.set("Cache-Control", "s-maxage=20, stale-while-revalidate=60");
    return res;
  } catch (err: any) {
    const status = err?.status ?? 500;
    if (status === 400) {
      return NextResponse.json({ ok: false, error: "bad_id" }, { status });
    }
    if (status === 401) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status });
    }
    if (status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status });
    }
    if (status === 404) {
      return NextResponse.json({}, { status });
    }
    if (status === 502) {
      return NextResponse.json({ ok: false, error: "upstream_error" }, { status });
    }
    if (status === 504) {
      return NextResponse.json({ ok: false, error: "upstream_timeout" }, { status });
    }
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
