import { env } from "@/lib/server/env";

const wordpressPublicUrl = new URL(process.env.NEXT_PUBLIC_WORDPRESS_URL ?? "http://localhost:8080");

function wordpressUploadUrl(value: string | null): URL | null {
  if (!value) return null;

  try {
    const source = new URL(value);
    if (source.origin !== wordpressPublicUrl.origin || !source.pathname.startsWith("/wp-content/uploads/")) return null;
    return new URL(`${source.pathname}${source.search}`, env.WORDPRESS_INTERNAL_URL);
  } catch {
    return null;
  }
}

/** Serves only WordPress uploads, avoiding an open proxy while supporting Docker's internal hostname. */
export async function GET(request: Request) {
  const source = new URL(request.url).searchParams.get("src");
  const upstreamUrl = wordpressUploadUrl(source);
  if (!upstreamUrl) return new Response("Invalid WordPress upload URL.", { status: 400 });

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: { Accept: "image/avif,image/webp,image/*,*/*;q=0.8" },
      next: { revalidate: 3_600 },
    });
    if (!upstream.ok || !upstream.body) return new Response("WordPress image is unavailable.", { status: 502 });

    const contentType = upstream.headers.get("content-type");
    if (!contentType?.startsWith("image/")) return new Response("WordPress did not return an image.", { status: 502 });

    return new Response(upstream.body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": upstream.headers.get("cache-control") ?? "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch {
    return new Response("WordPress image is unavailable.", { status: 502 });
  }
}
