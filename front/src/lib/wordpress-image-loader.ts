import type { ImageLoaderProps } from "next/image";

const wordpressPublicUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL ?? "http://localhost:8080";

function isWordPressUpload(src: string) {
  try {
    const source = new URL(src);
    return source.origin === new URL(wordpressPublicUrl).origin && source.pathname.startsWith("/wp-content/uploads/");
  } catch {
    return false;
  }
}

/**
 * Docker cannot let Next optimize a `localhost` WordPress URL: localhost inside
 * the frontend container is the frontend container itself. Route local uploads
 * through the application so the server can fetch them via its internal origin.
 */
export default function wordpressImageLoader({ quality, src, width }: ImageLoaderProps) {
  if (!isWordPressUpload(src)) return src;

  const params = new URLSearchParams({
    src,
    // `width` is selected from the image's srcset by the browser. Forward it
    // instead of proxying the full WordPress original for every candidate.
    w: String(width),
    q: String(quality ?? 75),
  });
  return `/api/images?${params}`;
}
