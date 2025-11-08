import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session";

type Body = { title?: string; date?: string; repeatYearly?: boolean };

export async function POST(req: Request) {
  try {
    const session = await getSessionFromCookies();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, date, repeatYearly }: Body = await req
      .json()
      .catch(() => ({} as Body));
    if (!title || !date) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const createRes = await fetch(
      `${
        process.env.NEXT_PUBLIC_SITE_URL ? "" : ""
      }/api/wp/wp-json/wp/v2/occasion`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "publish", title }),
        cache: "no-store",
      }
    );

    if (!createRes.ok) {
      const t = await createRes.text().catch(() => "");
      return NextResponse.json(
        { error: "WP create failed", details: t || createRes.statusText },
        { status: 502 }
      );
    }

    const created = await createRes.json();
    const id = created?.id;
    if (!id) {
      return NextResponse.json({ error: "No post id" }, { status: 502 });
    }

    const acfRes = await fetch(`/api/wp/wp-json/acf/v3/occasion/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
        { status: 502 }
      );
    }

    const acfSaved = await acfRes.json().catch(() => ({}));
    return NextResponse.json({ ok: true, id, acf: acfSaved }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
