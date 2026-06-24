// src/app/api/auth/logout/route.ts
import { NextResponse } from "next/server";
import { applyClearSessionCookies, clearSession } from "@/modules/auth/services/session";
import { getPublicSiteOrigin } from "@/lib/server/public-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  await clearSession();
  const response = NextResponse.redirect(
    new URL("/", getPublicSiteOrigin(req)),
    303,
  );
  await applyClearSessionCookies(response);
  return response;
}

export async function GET() {
  return NextResponse.json(
    { ok: false, error: "METHOD_NOT_ALLOWED" },
    { status: 405, headers: { "Cache-Control": "no-store" } },
  );
}
