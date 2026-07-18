import Link from "next/link";

const promptItems = [
  { label: "ارسال کادو برای", value: "ابراز علاقه", href: "/products?tag=sendlove" },
  { label: "ارسال کادو به نشانه", value: "قدردانی", href: "/products?tag=appreciation" },
  { label: "ارسال کادو برای عرض", value: "عذرخواهی", href: "/products?tag=apology" },
  { label: "ارسال کادو فقط بخاطر", value: "یک لبخند", href: "/products?tag=makesmile" },
  { label: "ارسال کادو جهت", value: "آرزوی سلامتی", href: "/products?tag=wishinghealth" },
  { label: "ارسال کادو برای", value: "یاد کردن", href: "/products?tag=toremember" },
] as const;

/** Legacy occasion shortcuts rebuilt with the semantic secondary surface tokens. */
export function OccasionPrompt() {
  return (
    <div className="grid grid-cols-2 gap-12 px-16 pb-16 min-[507px]:grid-cols-3">
      {promptItems.map((item) => (
        <Link
          className="flex min-h-128 flex-col items-center justify-center rounded-xl bg-secondary-container px-12 py-32 text-center no-underline transition-[filter,transform] duration-150 hover:-translate-y-1 hover:[filter:saturate(1.05)]"
          href={item.href}
          key={item.href}
        >
          <span className="text-label-12 font-regular leading-[var(--text-label-12--line-height)] text-secondary">
            {item.label}
          </span>
          <strong className="mt-4 text-title-18 font-extrabold leading-[var(--text-title-18--line-height)] text-secondary">
            {item.value}
          </strong>
        </Link>
      ))}
    </div>
  );
}
