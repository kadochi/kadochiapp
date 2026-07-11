import { Breadcrumb } from "./ui/breadcrumb";

const breadcrumbExamples = [
  {
    name: "Default",
    items: [
      { label: "خانه", href: "/" },
      { label: "محصولات", href: "/products" },
      { label: "موبایل و تبلت", href: "/products/mobile" },
      { label: "گوشی موبایل" },
    ],
  },
  {
    name: "Long path",
    items: [
      { label: "خانه", href: "/" },
      { label: "لوازم دیجیتال", href: "/digital" },
      { label: "موبایل و تبلت", href: "/digital/mobile" },
      { label: "گوشی موبایل", href: "/digital/mobile/phones" },
      { label: "گوشی اپل", href: "/digital/mobile/phones/apple" },
      { label: "آیفون ۱۶ پرو مکس" },
    ],
  },
  {
    name: "Collapsed (maxItems=4)",
    maxItems: 4,
    items: [
      { label: "خانه", href: "/" },
      { label: "لوازم دیجیتال", href: "/digital" },
      { label: "موبایل و تبلت", href: "/digital/mobile" },
      { label: "گوشی موبایل", href: "/digital/mobile/phones" },
      { label: "گوشی اپل", href: "/digital/mobile/phones/apple" },
      { label: "آیفون", href: "/digital/mobile/phones/apple/iphone" },
      { label: "آیفون ۱۶", href: "/digital/mobile/phones/apple/iphone/16" },
      { label: "آیفون ۱۶ پرو مکس" },
    ],
  },
];

function BreadcrumbPreview() {
  return (
    <section className="mt-16" aria-labelledby="breadcrumb-heading">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h2 id="breadcrumb-heading" className="text-heading-24 font-regular">
          Breadcrumb
        </h2>
        <p className="text-label-12 text-surface-neutral-low-emphasis">
          RTL · horizontally scrollable · collapsed overflow menu
        </p>
      </div>

      <div className="overflow-hidden rounded-m border border-border-low-emphasis bg-surface-background">
        {breadcrumbExamples.map(({ name, items, maxItems }, index) => (
          <div
            key={name}
            className={
              index === breadcrumbExamples.length - 1
                ? ""
                : "border-b border-border-low-emphasis"
            }
          >
            <p className="px-5 pt-5 text-label-12 font-regular text-surface-neutral-mid-emphasis">
              {name}
            </p>
            <Breadcrumb items={items} maxItems={maxItems} />
          </div>
        ))}
      </div>
    </section>
  );
}

export { BreadcrumbPreview };
