// src/app/api/profile/update/route.ts
import { NextResponse } from "next/server";
import { getSessionFromCookies, setSession } from "@/lib/auth/session";
import { updateCustomer, type WooCustomer } from "@/lib/api/woo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const sess = await getSessionFromCookies();
    if (!sess.userId) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHORIZED" },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    const j = (await req.json().catch(() => ({}))) as Record<string, string>;
    const first_name = (j.first_name ?? "").trim();
    const last_name = (j.last_name ?? "").trim();
    const phone = (j.phone ?? "").trim();
    const email = (j.email ?? "").trim();

    if (!first_name && !last_name && !phone && !email) {
      return NextResponse.json(
        { ok: false, error: "EMPTY_PAYLOAD" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const payload: Partial<WooCustomer> = {};
    if (first_name) payload.first_name = first_name;
    if (last_name) payload.last_name = last_name;
    if (email) payload.email = email;
    if (phone || email) {
      payload.billing = {
        ...(phone ? { phone } : {}),
        ...(email ? { email } : {}),
      };
    }

    await updateCustomer(sess.userId, payload);

    await setSession(sess.userId, {
      firstName: first_name || sess.firstName || null,
      lastName: last_name || sess.lastName || null,
      phone: phone || sess.phone || null,
      name:
        (first_name || last_name
          ? `${first_name ?? ""} ${last_name ?? ""}`.trim()
          : sess.name) || null,
    });

    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    console.error("[api/profile/update] failed:", e);
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
