import { Button } from "../components/ui/button";
import { Breadcrumb } from "../components/ui/breadcrumb";
import { Eye } from "lucide-react";

const buttonVariants = [
  { name: "Primary", value: "primary-filled" as const },
  { name: "Primary tonal", value: "primary-tonal" as const },
  { name: "Secondary", value: "secondary-filled" as const },
  { name: "Secondary tonal", value: "secondary-tonal" as const },
  { name: "Outline", value: "tertiary-outline" as const },
  { name: "Ghost", value: "link-ghost" as const },
];

const sizes = ["small", "medium", "large"] as const;

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
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-surface-soft px-5 py-10 font-sans text-text-primary sm:px-8 sm:py-14">
      <div className="mx-auto max-w-5xl">
        <header className="mb-12 border-b border-border-low-emphasis pb-6">
          <p className="text-label-12 text-surface-neutral-low-emphasis">Kadochi</p>
          <h1 className="mt-2 text-heading-32 font-regular tracking-[-.04em]">
            Components
          </h1>
        </header>

        <section aria-labelledby="buttons-heading">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 id="buttons-heading" className="text-heading-24 font-regular">
              Button
            </h2>
            <p className="text-label-12 text-surface-neutral-low-emphasis">
              6 variants · 3 sizes · 3 states
            </p>
          </div>

          <div className="overflow-x-auto rounded-m border border-border-low-emphasis bg-surface-background">
            <table className="w-full min-w-175 border-collapse text-left">
              <thead className="border-b border-border-low-emphasis">
                <tr>
                  <th scope="col" className="w-40 px-5 py-4 text-label-12 font-regular text-surface-neutral-mid-emphasis">
                    Variant
                  </th>
                  {sizes.map((size) => (
                    <th key={size} scope="col" className="px-5 py-4 text-label-12 font-regular capitalize text-surface-neutral-mid-emphasis">
                      {size}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {buttonVariants.map(({ name, value }, index) => (
                  <tr key={value} className={index === buttonVariants.length - 1 ? "" : "border-b border-border-low-emphasis"}>
                    <th scope="row" className="whitespace-nowrap px-5 py-5 text-label-14 font-regular">
                      {name}
                    </th>
                    {sizes.map((size) => (
                      <td key={size} className="px-5 py-5">
                        <div className="flex flex-col items-start gap-2">
                          <Button variant={value} size={size}>
                            <Eye aria-hidden="true" />
                            Preview
                          </Button>
                          <Button variant={value} size={size} disabled>
                            <Eye aria-hidden="true" />
                            Disabled
                          </Button>
                          <Button variant={value} size={size} loading>
                            Preview
                          </Button>
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-16" aria-labelledby="breadcrumb-heading">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 id="breadcrumb-heading" className="text-heading-24 font-regular">
              Breadcrumb
            </h2>
            <p className="text-label-12 text-surface-neutral-low-emphasis">
              RTL · horizontally scrollable
            </p>
          </div>

          <div className="overflow-hidden rounded-m border border-border-low-emphasis bg-surface-background">
            {breadcrumbExamples.map(({ name, items }, index) => (
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
                <Breadcrumb items={items} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
