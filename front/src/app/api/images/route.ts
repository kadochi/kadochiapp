import { env } from "@/lib/server/env";
import sharp from "sharp";

const wordpressPublicUrl = new URL(process.env.NEXT_PUBLIC_WORDPRESS_URL ?? "http://localhost:8080");
// Keep this in sync with Next's default imageSizes and deviceSizes. The
// endpoint only accepts candidates that the custom Next image loader emits.
const imageWidths = new Set([16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840]);
const imageQualities = new Set([55, 60, 75]);

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

function imageOptions(request: Request): { quality: number; width: number } | null {
  const params = new URL(request.url).searchParams;
  const width = Number(params.get("w"));
  const quality = Number(params.get("q") ?? 75);
  if (!imageWidths.has(width) || !imageQualities.has(quality)) return null;
  return { quality, width };
}

function outputFormat(request: Request): "avif" | "webp" {
  return request.headers.get("accept")?.includes("image/avif") ? "avif" : "webp";
}

/** Serves only WordPress uploads, avoiding an open proxy while supporting Docker's internal hostname. */
export async function GET(request: Request) {
  const source = new URL(request.url).searchParams.get("src");
  const upstreamUrl = wordpressUploadUrl(source);
  if (!upstreamUrl) return new Response("Invalid WordPress upload URL.", { status: 400 });
  const options = imageOptions(request);
  if (!options) return new Response("Invalid image dimensions.", { status: 400 });

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: { Accept: "image/avif,image/webp,image/*,*/*;q=0.8" },
      next: { revalidate: 3_600 },
    });
    if (!upstream.ok || !upstream.body) return new Response("WordPress image is unavailable.", { status: 502 });

    const contentType = upstream.headers.get("content-type");
    if (!contentType?.startsWith("image/")) return new Response("WordPress did not return an image.", { status: 502 });

    const format = outputFormat(request);
    const image = sharp(Buffer.from(await upstream.arrayBuffer())).resize({
      width: options.width,
      withoutEnlargement: true,
    });
    const body = format === "avif"
      ? await image.avif({ quality: options.quality }).toBuffer()
      : await image.webp({ quality: options.quality }).toBuffer();

    return new Response(body, {
      headers: {
        "Content-Type": `image/${format}`,
        // Upload paths are versioned by WordPress, so transformed variants can
        // stay hot in the CDN and avoid repeat image processing on LCP visits.
        "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
        "Vary": "Accept",
      },
    });
  } catch {
    return new Response("WordPress image is unavailable.", { status: 502 });
  }
}
