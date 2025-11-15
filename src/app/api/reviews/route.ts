// src/app/api/reviews/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session";

let getCustomerById: ((id: number) => Promise<any>) | undefined;
let createProductReview:
  | ((
      productId: number | string,
      payload: {
        review: string;
        reviewer?: string;
        reviewer_email?: string | null;
        rating: number;
        status?: "approved" | "hold" | "spam" | "trash" | "unspam" | "untrash";
      }
    ) => Promise<any>)
  | undefined;

try {
  const mod = require("@/lib/api/woo");
  getCustomerById = mod.getCustomerById;
  createProductReview = mod.createProductReview;
} catch {}

async function fallbackCreateReview(productId: number | string, payload: any) {
  const base = process.env.WOO_BASE_URL || process.env.WP_BASE_URL;
  const key = process.env.WOO_CONSUMER_KEY;
  const sec = process.env.WOO_CONSUMER_SECRET;
  if (!base || !key || !sec) throw new Error("Woo credentials are missing");

  const url =
    `${base.replace(/\/$/, "")}/wp-json/wc/v3/products/reviews` +
    `?consumer_key=${encodeURIComponent(key)}` +
    `&consumer_secret=${encodeURIComponent(sec)}`;

  const body = {
    product_id: Number(productId),
    review: String(payload.review || ""),
    reviewer: payload.reviewer || "Kadochi User",
    reviewer_email: payload.reviewer_email || "noreply@kadochi.com",
    rating: Math.max(1, Math.min(5, Number(payload.rating) || 0)),
    status: payload.status || "hold",
  };

  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`Woo review create failed ${r.status}: ${txt}`);
  }
  return r.json();
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const sess = await getSessionFromCookies();
    if (!sess?.userId) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const { productId, rating, text } = (await req
      .json()
      .catch(() => ({}))) as {
      productId?: number | string;
      rating?: number;
      text?: string;
    };

    if (!productId || !rating || !text || !String(text).trim()) {
      return NextResponse.json(
        { ok: false, error: "BAD_REQUEST" },
        { status: 400 }
      );
    }

    let reviewer = "";
    try {
      if (getCustomerById) {
        const c = await getCustomerById(sess.userId);
        reviewer =
          [c?.first_name?.trim(), c?.last_name?.trim()]
            .filter(Boolean)
            .join(" ")
            .trim() ||
          c?.billing?.first_name?.trim() ||
          "";
      }
    } catch {}

    if (!reviewer) {
      reviewer =
        [sess.firstName?.trim(), sess.lastName?.trim()]
          .filter(Boolean)
          .join(" ")
          .trim() ||
        sess.phone?.trim() ||
        "Kadochi User";
    }

    const reviewer_email =
      (sess?.phone ? `${sess.phone}@users.kadochi.local` : null) ||
      "noreply@kadochi.com";

    const createFn = async (pid: number | string, payload: any) => {
      if (createProductReview) {
        return await createProductReview(pid, payload);
      }
      return await fallbackCreateReview(pid, payload);
    };

    await createFn(productId, {
      review: String(text).trim(),
      reviewer,
      reviewer_email,
      rating: Math.max(1, Math.min(5, Number(rating) || 0)),
      status: "hold",
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = typeof e?.message === "string" ? e.message : "SERVER_ERROR";
    console.error("[api/reviews] failed:", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
