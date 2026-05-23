import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { getSessionFromCookies } from "@/lib/auth/session";
import { wordpressFetch } from "@/services/wordpress";

type RouteParams = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, ctx: RouteParams) {
  try {
    const session = await getSessionFromCookies();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const occasionId = parseInt(id, 10);
    if (!id || isNaN(occasionId)) {
      return NextResponse.json({ error: "Invalid occasion id" }, { status: 400 });
    }

    const getRes = await wordpressFetch(
      `/wp-json/wp/v2/occasion/${occasionId}`,
      { cache: "no-store" }
    );

    if (!getRes.ok) {
      if (getRes.status === 404) {
        return NextResponse.json({ error: "Occasion not found" }, { status: 404 });
      }
      const t = await getRes.text().catch(() => "");
      return NextResponse.json(
        { error: "WP fetch failed", details: t || getRes.statusText },
        { status: 502 }
      );
    }

    const occasion = await getRes.json();
    const author = occasion?.author;
    if (author != null && Number(author) !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const deleteRes = await wordpressFetch(
      `/wp-json/wp/v2/occasion/${occasionId}`,
      { method: "DELETE", cache: "no-store" }
    );

    if (!deleteRes.ok) {
      const t = await deleteRes.text().catch(() => "");
      return NextResponse.json(
        { error: "WP delete failed", details: t || deleteRes.statusText },
        { status: 502 }
      );
    }

    revalidatePath("/occasions");
    revalidateTag("occasions", "max");
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
