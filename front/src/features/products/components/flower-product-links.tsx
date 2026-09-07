import Link from "next/link";

const flowerLinks = [
  {
    href: "/products?tag=flower-bouquet",
    image: "/images/home-categories/flower-bouquet.png",
    label: "دسته گل",
  },
  {
    href: "/products?tag=flower-jar",
    image: "/images/home-categories/flower-jar.png",
    label: "گل جار",
  },
  {
    href: "/products?tag=flower-box",
    image: "/images/home-categories/flower-box.png",
    label: "باکس گل",
  },
] as const;

/** Fixed flower-type shortcuts shown only on the flower product listing. */
export function FlowerProductLinks() {
  return (
    <nav aria-label="انواع گل" className="grid w-full grid-cols-3 gap-8 px-16 py-8" dir="rtl">
      {flowerLinks.map((item) => (
        <Link
          className="flex min-w-0 flex-col items-center gap-4 rounded-[var(--radius-l)] border border-border-mid-emphasis px-4 py-8 text-center no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
          href={item.href}
          key={item.label}
          prefetch={false}
        >
          {/* Fixed local illustrations do not need an image optimizer request. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="" className="size-96 max-w-full object-contain" src={item.image} />
          <span className="line-clamp-1 w-full text-label-12 font-bold leading-[var(--text-label-12--line-height)] text-surface-neutral-high-emphasis">
            {item.label}
          </span>
        </Link>
      ))}
    </nav>
  );
}
