// src/app/api/orders/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getOrderDetailForSession } from "@/lib/api/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Ctx = { params: { id: string } };

function noStore(res: NextResponse) {
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("Vary", "Cookie");
  return res;
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const orderId = (params.id || "").trim();

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

export async function POST(req: NextRequest, { params }: Ctx) {
  const orderId = (params.id || "").trim();
  if (!orderId) {
    return noStore(
      NextResponse.json({ ok: false, error: "bad_id" }, { status: 400 })
    );
  }

  const body = await req.json().catch(() => ({} as any));
  console.log("[api/orders] payment meta", { orderId, body });

  return noStore(NextResponse.json({ ok: true }, { status: 200 }));
}
