import { NextResponse } from "next/server";
import { listProducts } from "@/domains/catalog/services/woo.server";

export const revalidate = 60;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const page = Number(searchParams.get("page") || "1");
  const perPage = Number(searchParams.get("per_page") || "12");
  const order = (searchParams.get("order") || "desc") as "asc" | "desc";
  const orderby = (searchParams.get("orderby") || "date") as
    | "date"
    | "price"
    | "popularity"
    | "rating";

  const q = searchParams.get("q") || undefined;
  const category = searchParams.get("category") || undefined;
  const tag = searchParams.get("tag") || undefined;
  const min_price = searchParams.get("min_price") || undefined;
  const max_price = searchParams.get("max_price") || undefined;

  const combinedTag =
    tag === "fatherday" || tag === "motherday"
      ? "fatherday,motherday"
      : tag || undefined;

  try {
    const data = await listProducts({
      page,
      perPage,
      search: q,
      category,
      tag: combinedTag,
      order,
      orderby,
      min_price,
      max_price,
    } as any);

    return NextResponse.json(data, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "failed" },
      { status: 500 }
    );
  }
}
