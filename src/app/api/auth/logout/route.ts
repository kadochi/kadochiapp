// src/app/api/auth/logout/route.ts
import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  await clearSession();
  return NextResponse.redirect(new URL("/", req.url), 303);
}

export async function GET() {
  return NextResponse.json(
    { ok: false, error: "METHOD_NOT_ALLOWED" },
    { status: 405, headers: { "Cache-Control": "no-store" } }
  );
}
