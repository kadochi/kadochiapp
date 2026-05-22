// src/app/api/profile/update/route.ts
import { NextResponse } from "next/server";
import { getSessionFromCookies, setSession } from "@/lib/auth/session";
import { updateCustomer } from "@/lib/api/woo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Incoming =
  | { first_name?: string; last_name?: string; phone?: string; email?: string }
  | URLSearchParams;

// Parse JSON or x-www-form-urlencoded bodies (backward-compatible)
async function readBody(req: Request) {
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    const j = (await req.json().catch(() => ({}))) as Record<string, string>;
    return {
      first_name: j.first_name?.trim(),
      last_name: j.last_name?.trim(),
      phone: j.phone?.trim(),
      email: j.email?.trim(),
    };
  }
  if (ct.includes("application/x-www-form-urlencoded")) {
    const form = await req.text();
    const sp = new URLSearchParams(form);
    return {
      first_name: sp.get("first_name")?.trim() || undefined,
      last_name: sp.get("last_name")?.trim() || undefined,
      phone: sp.get("phone")?.trim() || undefined,
      email: sp.get("email")?.trim() || undefined,
    };
  }
  // Fallback: try JSON anyway
  const j = (await req.json().catch(() => ({}))) as Record<string, string>;
  return {
    first_name: j.first_name?.trim(),
    last_name: j.last_name?.trim(),
    phone: j.phone?.trim(),
    email: j.email?.trim(),
  };
}

export async function POST(req: Request) {
  try {
    const sess = await getSessionFromCookies();
    if (!sess.userId) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHORIZED" },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    const body = await readBody(req);
    const first_name = body.first_name ?? "";
    const last_name = body.last_name ?? "";
    const phone = body.phone ?? "";
    const email = body.email ?? "";

    if (!first_name && !last_name && !phone && !email) {
      return NextResponse.json(
        { ok: false, error: "EMPTY_PAYLOAD" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    // Build Woo payload (keeps legacy shape)
    const payload: any = {};
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

    // Refresh cookie session (so Profile/Header show updated name)
    await setSession(sess.userId, {
      firstName: first_name || sess.firstName || null,
      lastName: last_name || sess.lastName || null,
      phone: phone || sess.phone || null,
      // Keep your display priority on client; here we store concatenated name if provided
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
