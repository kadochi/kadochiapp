import { timingSafeEqual } from "crypto";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const allowedTags = new Set(["magazine-articles", "magazine-categories"]);

function secretsMatch(provided: string, expected: string): boolean {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer);
}

/** Invalidates only editorial cache entries after WordPress receives an article. */
export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  const provided = request.headers.get("x-kadochi-revalidate-key") ?? "";
  if (!secret || !secretsMatch(provided, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const tags = typeof payload === "object" && payload !== null && Array.isArray((payload as { tags?: unknown }).tags)
    ? (payload as { tags: unknown[] }).tags.filter((tag): tag is string => typeof tag === "string" && allowedTags.has(tag))
    : [];
  if (!tags.length) {
    return NextResponse.json({ error: "No permitted tags" }, { status: 400 });
  }

  for (const tag of tags) revalidateTag(tag, "max");
  return NextResponse.json({ revalidated: tags });
}
