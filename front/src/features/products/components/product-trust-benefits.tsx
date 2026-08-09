import { CalendarClock, Gift, PackageCheck, type LucideIcon } from "lucide-react";

type TrustBenefit = {
  title: string;
  mobileTitle: readonly [string, string];
  description: string;
  icon: LucideIcon;
};

const benefits: readonly TrustBenefit[] = [
  {
    title: "تحویل زمان‌بندی‌شده",
    mobileTitle: ["تحویل", "زمان‌بندی‌شده"],
    description: "روز و بازه تحویل را خودتان انتخاب کنید",
    icon: CalendarClock,
  },
  {
    title: "آماده برای هدیه دادن",
    mobileTitle: ["آماده برای", "هدیه دادن"],
    description: "با بسته‌بندی و پیام شخصی شما",
    icon: Gift,
  },
  {
    title: "همراه شما تا تحویل",
    mobileTitle: ["همراه شما", "تا تحویل"],
    description: "پیگیری سفارش تا لحظه تحویل به گیرنده",
    icon: PackageCheck,
  },
];

/** Compact purchase reassurance shown beside the PDP's primary decision details. */
export function ProductTrustBenefits() {
  return (
    <section
      aria-labelledby="product-trust-benefits-title"
      className="px-16 pb-16 [direction:rtl]"
    >
      <h2 id="product-trust-benefits-title" className="sr-only">
        مزایای خرید از کادوچی
      </h2>
      <ul className="mx-auto grid max-w-[580px] grid-cols-3 p-0">
        {benefits.map(({ title, mobileTitle, description, icon: Icon }) => (
          <li className="relative flex min-w-0 flex-col items-center gap-8 px-8 py-12 text-center after:content-[''] [&:not(:last-child)::after]:absolute [&:not(:last-child)::after]:left-0 [&:not(:last-child)::after]:top-1/2 [&:not(:last-child)::after]:h-4/5 [&:not(:last-child)::after]:w-px [&:not(:last-child)::after]:-translate-y-1/2 [&:not(:last-child)::after]:bg-border-low-emphasis" key={title}>
            <span className="inline-flex size-40 shrink-0 items-center justify-center rounded-rounded bg-primary-container text-on-primary-container" aria-hidden="true">
              <Icon className="size-24" strokeWidth={1.75} />
            </span>
            <span className="min-w-0">
              <span className="block text-label-12 font-bold leading-[var(--text-label-12--line-height)] text-surface-neutral-high-emphasis">
                <span className="min-[768px]:hidden">
                  <span className="block">{mobileTitle[0]}</span>
                  <span className="block">{mobileTitle[1]}</span>
                </span>
                <span className="hidden whitespace-nowrap min-[768px]:inline">{title}</span>
              </span>
              <span className="mt-4 block text-label-10 leading-[var(--text-label-10--line-height)] text-surface-neutral-mid-emphasis">
                {description}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
