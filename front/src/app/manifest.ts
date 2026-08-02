import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kadochi",
    short_name: "Kadochi",
    description: "کادوچی، فروشگاه آنلاین خرید کادو، گل و کیک با ارسال سریع.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#600487",
    lang: "fa",
    dir: "rtl",
    icons: [
      { src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/pwa/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/pwa/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
