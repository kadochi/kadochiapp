// src/app/api/orders/route.ts
// Paginated orders for the current session: GET ?page=1&per_page=5

import { NextResponse } from "next/server";
import { listOrdersForSessionPaged } from "@/lib/api/orders";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
    const perPage = Math.min(
      50,
      Math.max(1, Number(url.searchParams.get("per_page") || "5"))
    );

    const items = await listOrdersForSessionPaged(page, perPage);
    const hasMore = items.length === perPage;

    return NextResponse.json(
      { items, page, per_page: perPage, has_more: hasMore },
      { status: 200 }
    );
  } catch (err: any) {
    const status = Number(err?.status) || 500;
    return NextResponse.json(
      { error: String(err?.message || "server_error") },
      { status }
    );
  }
}
