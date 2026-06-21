import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { getSessionFromCookies } from "@/lib/auth/session";
import { wordpressFetch } from "@/services/wordpress";
import { toAcfOccasionDate } from "@/lib/jalali";
import {
  UpstreamAuthError,
  UpstreamBadResponse,
  UpstreamNetworkError,
  UpstreamTimeout,
} from "@/services/http/errors";

type Body = { title?: string; date?: string; repeatYearly?: boolean };

export async function POST(req: Request) {
  try {
    const session = await getSessionFromCookies();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // FIX #7 — explicit try/catch instead of .catch(() => ({}) as Body).
    // The misleading type cast is gone; malformed JSON resolves to an empty
    // object and falls through to the !title || !date guard below.
    let body: Body = {};
    try {
      body = await req.json();
    } catch {
      // malformed JSON — title/date guard below will reject the request
    }
    const { title, date, repeatYearly } = body;

    if (!title || !date) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    // FIX #3 — validate + convert the date BEFORE any WordPress call so a bad
    // date value returns a clean 400 instead of a cryptic 500 from inside
    // toAcfOccasionDate throwing in the middle of the request.
    const acfDate = toAcfOccasionDate(date);
    if (!acfDate) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 },
      );
    }

    // FIX #2 (part 1) — create the post as "draft", not "publish".
    // If the ACF write fails we can hard-delete a draft instead of leaving a
    // live post with no metadata visible to the public.
    //
    // FIX #5 — author ID comes from an env variable; hardcoding 1 is fragile
    // across migrations, multisite setups, or user deletions.
    const createRes = await wordpressFetch("/wp-json/wp/v2/occasion", {
      method: "POST",
      body: JSON.stringify({
        status: "draft",
        title,
        author: Number(process.env.WP_SERVICE_ACCOUNT_ID ?? 1),
      }),
      cache: "no-store",
    });

    if (!createRes.ok) {
      const t = await createRes.text().catch(() => "");
      console.error(
        "[api/occasions/new] WP create failed:",
        createRes.status,
        t,
      );
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
          // FIX #4 — title removed from ACF fields. WP core post_title is the
          // single source of truth; duplicating it here risks silent drift if a
          // future update only touches one side.
          occasion_date: acfDate,
          repeat_yearly: !!repeatYearly,
          user_id: session.userId,
        },
      }),
      cache: "no-store",
    });

    if (!acfRes.ok) {
      const t = await acfRes.text().catch(() => "");
      console.error("[api/occasions/new] ACF update failed:", acfRes.status, t);

      // FIX #2 (part 2) — compensating rollback: hard-delete the draft so we
      // don't accumulate orphaned posts with no metadata on every ACF hiccup.
      await wordpressFetch(`/wp-json/wp/v2/occasion/${id}?force=true`, {
        method: "DELETE",
        cache: "no-store",
      }).catch((err) =>
        console.error("[api/occasions/new] rollback delete failed:", err),
      );

      return NextResponse.json(
        { error: "ACF update failed", details: t || acfRes.statusText },
        { status: 502 },
      );
    }

    // FIX #6 — log the parse failure instead of swallowing it silently so we
    // can distinguish "ACF returned garbage" from "ACF returned empty object".
    const acfSaved = await acfRes.json().catch((err) => {
      console.warn("[api/occasions/new] ACF response parse failed:", err);
      return {};
    });

    // FIX #2 (part 3) — all fields are written; now it is safe to publish.
    // If this final step fails, roll back the same way.
    const publishRes = await wordpressFetch(`/wp-json/wp/v2/occasion/${id}`, {
      method: "POST",
      body: JSON.stringify({ status: "publish" }),
      cache: "no-store",
    });

    if (!publishRes.ok) {
      const t = await publishRes.text().catch(() => "");
      console.error(
        "[api/occasions/new] WP publish failed:",
        publishRes.status,
        t,
      );

      await wordpressFetch(`/wp-json/wp/v2/occasion/${id}?force=true`, {
        method: "DELETE",
        cache: "no-store",
      }).catch((err) =>
        console.error(
          "[api/occasions/new] rollback delete after publish failure:",
          err,
        ),
      );

      return NextResponse.json(
        { error: "WP publish failed", details: t || publishRes.statusText },
        { status: 502 },
      );
    }

    revalidatePath("/occasions");
    revalidateTag("occasions", "max");

    return NextResponse.json({ ok: true, id, acf: acfSaved }, { status: 201 });
  } catch (error) {
    console.error("[api/occasions/new] failed:", error);

    if (error instanceof UpstreamAuthError) {
      return NextResponse.json(
        { error: "WordPress authentication failed" },
        { status: 502 },
      );
    }
    if (error instanceof UpstreamTimeout) {
      return NextResponse.json(
        { error: "WordPress request timed out" },
        { status: 504 },
      );
    }
    if (
      error instanceof UpstreamBadResponse ||
      error instanceof UpstreamNetworkError
    ) {
      return NextResponse.json(
        { error: "WordPress request failed" },
        { status: 502 },
      );
    }

    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
