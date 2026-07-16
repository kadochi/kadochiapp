import { Star } from "lucide-react";

import SectionHeader from "@/components/layout/section-header";
import { Avatar } from "@/components/ui/avatar";
import { listProductReviews } from "../services/products.server";

export type ProductReviewsProps = {
  productId: number;
};

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString("fa-IR", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return "";
  }
}

/** Read-only reviews list. A failed fetch renders an empty state instead of breaking the page. */
export async function ProductReviews({ productId }: Readonly<ProductReviewsProps>) {
  let reviews: Awaited<ReturnType<typeof listProductReviews>> = [];

  try {
    reviews = await listProductReviews({ productId });
  } catch {
    reviews = [];
  }

  return (
    <section aria-label="نظرات کاربران">
      <SectionHeader
        title="نظرات کاربران"
        subtitle={reviews.length ? `${reviews.length.toLocaleString("fa-IR")} نظر ثبت شده` : "بدون نظر"}
      />

      <div className="px-16">
        {reviews.length === 0 ? (
          <p className="py-16 text-center font-sans text-body-14 text-surface-neutral-mid-emphasis">
            تاکنون نظری ثبت نشده است.
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-16 p-0">
            {reviews.map((review) => (
              <li key={review.id} className="border-b border-border-low-emphasis pb-16 last:border-b-0 last:pb-0 [direction:rtl]">
                <div className="flex items-center justify-between gap-8">
                  <div className="flex items-center gap-8">
                    <Avatar alt={review.author} size="md" src={review.avatarUrl} />
                    <div>
                      <div className="font-sans text-label-14 font-bold text-surface-neutral-high-emphasis">{review.author}</div>
                      <div className="font-sans text-label-12 text-surface-neutral-low-emphasis">{formatDate(review.createdAt)}</div>
                    </div>
                  </div>

                  {review.rating != null ? (
                    <div className="flex items-center gap-4 text-surface-neutral-mid-emphasis" aria-label="امتیاز کاربر">
                      <Star aria-hidden className="size-16" />
                      <span className="font-sans text-label-14">
                        {review.rating.toLocaleString("fa-IR", { maximumFractionDigits: 1 })}
                      </span>
                    </div>
                  ) : null}
                </div>

                <p className="mt-8 font-sans text-body-14 text-surface-neutral-mid-emphasis">{review.content}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
