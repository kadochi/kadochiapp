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
export default function wordpressImageLoader({ src }: ImageLoaderProps) {
  return isWordPressUpload(src) ? `/api/images?src=${encodeURIComponent(src)}` : src;
}
