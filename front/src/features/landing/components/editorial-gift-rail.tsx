/* eslint-disable @next/next/no-img-element -- Editorial images are supplied by the trusted content API. */

import { Price } from "@/components/layout/price";
import type { HomepageContent } from "@/features/content/types";
import { stripHtml } from "@/features/products/utils/strip-html";

type EditorialGiftRailProps = {
  items: HomepageContent["gifts"];
};

function parseToman(value: string | null) {
  if (!value) return null;
  const digits = value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[^0-9]/g, "");
  return digits ? Number(digits) : null;
}

/** CMS-managed gift cards. Product rails remain sourced from the Store API. */
export function EditorialGiftRail({ items }: Readonly<EditorialGiftRailProps>) {
  const gifts = items.filter((gift) => gift.title.trim());
  if (!gifts.length) return null;

  return (
    <section aria-label="پیشنهادهای منتخب" className="grid gap-12 px-16 pb-16 sm:grid-cols-2 lg:grid-cols-3">
      {gifts.slice(0, 6).map((gift) => {
        const toman = parseToman(gift.price);
        const description = stripHtml(gift.description);

        return (
          <article className="overflow-hidden rounded-xl bg-surface-soft" key={gift.id}>
            <div className="relative aspect-[1.45/1] bg-secondary-container">
              {gift.image ? (
                <img
                  alt={gift.image.alt || gift.title}
                  className="absolute inset-0 size-full object-cover"
                  loading="lazy"
                  src={gift.image.url}
                />
              ) : null}
            </div>
            <div className="grid gap-8 p-16 text-right">
              <h3 className="m-0 text-title-16 font-bold leading-[var(--text-title-16--line-height)] text-surface-neutral-high-emphasis">
                {gift.title}
              </h3>
              {description ? (
                <p className="m-0 line-clamp-2 text-body-14 font-regular leading-[var(--text-body-14--line-height)] text-surface-neutral-mid-emphasis">
                  {description}
                </p>
              ) : null}
              {toman !== null ? (
                <Price current={toman} />
              ) : null}
            </div>
          </article>
        );
      })}
    </section>
  );
}
