import { NextResponse } from "next/server";
import { listOrdersForSession } from "@/lib/api/orders";

export const runtime = "nodejs";

export async function GET() {
  try {
    const orders = await listOrdersForSession();
    return NextResponse.json(orders, {
      status: 200,
      headers: { "Cache-Control": "private, max-age=0, s-maxage=0" },
    });
  } catch (err: any) {
    if (err?.status === 401) {
      return NextResponse.json({ ok: false, error: "unauth" }, { status: 401 });
    }
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}
