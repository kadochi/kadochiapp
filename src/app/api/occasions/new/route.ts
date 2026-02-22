import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { getSessionFromCookies } from "@/lib/auth/session";
import { wordpressFetch } from "@/services/wordpress";

type Body = { title?: string; date?: string; repeatYearly?: boolean };

export async function POST(req: Request) {
  try {
    const session = await getSessionFromCookies();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, date, repeatYearly }: Body = await req
      .json()
      .catch(() => ({}) as Body);
    if (!title || !date) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const createRes = await wordpressFetch("/wp-json/wp/v2/occasion", {
      method: "POST",
      body: JSON.stringify({ status: "publish", title }),
      cache: "no-store",
    });

    if (!createRes.ok) {
      const t = await createRes.text().catch(() => "");
      return NextResponse.json(
        { error: "WP create failed", details: t || createRes.statusText },
        { status: 502 },
      );
    }

    const created = await createRes.json();
    const id = created?.id;
    if (!id) {
      return NextResponse.json({ error: "No post id" }, { status: 502 });
    }

    const acfRes = await wordpressFetch(`/wp-json/acf/v3/occasion/${id}`, {
      method: "POST",
      body: JSON.stringify({
        fields: {
          title,
          occasion_date: date,
          repeat_yearly: !!repeatYearly,
          user_id: session.userId,
        },
      }),
      cache: "no-store",
    });

    if (!acfRes.ok) {
      const t = await acfRes.text().catch(() => "");
      return NextResponse.json(
        { error: "ACF update failed", details: t || acfRes.statusText },
        { status: 502 },
      );
    }

    const acfSaved = await acfRes.json().catch(() => ({}));
    revalidatePath("/occasions");
    revalidateTag("occasions");
    return NextResponse.json({ ok: true, id, acf: acfSaved }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
