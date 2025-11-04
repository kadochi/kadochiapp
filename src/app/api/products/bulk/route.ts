// src/app/api/products/bulk/route.ts
import { NextResponse } from "next/server";
import { getProductsByIds } from "@/services/products";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const ids = (searchParams.get("ids") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const items = await getProductsByIds(ids);
    return NextResponse.json({ items }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "failed" },
      { status: 500 }
    );
  }
}
