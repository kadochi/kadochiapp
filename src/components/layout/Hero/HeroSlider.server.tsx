import BannerClient from "./HeroSliderClient";

type BannerData = {
  title: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
  backgroundImage: string;
};

export const revalidate = 300;

async function getBanners(): Promise<BannerData[]> {
  const r = await fetch(
    `${
      process.env.NEXT_PUBLIC_BASE_URL ?? ""
    }/api/wp/wp-json/wp/v2/hero?acf_format=standard`,
    { next: { revalidate: 300 }, cache: "force-cache" }
  ).catch(() => null);

  if (!r || !r.ok) return [];
  const data = await r.json().catch(() => []);
  if (!Array.isArray(data)) return [];
  return data
    .map((item: any) => {
      const acf = item?.acf || {};
      const bg =
        typeof acf?.background_image === "string"
          ? acf.background_image
          : acf?.background_image?.url || "";
      return {
        title: acf.title || "",
        subtitle: acf.subtitle || "",
        ctaText: acf.cta_text || "",
        ctaLink: acf.cta_link || "#",
        backgroundImage: bg,
      };
    })
    .filter((b: BannerData) => b.title && b.backgroundImage);
}

export default async function HeroSliderServer() {
  const banners = await getBanners();
  return <BannerClient initialBanners={banners} />;
}
