import { cn } from "@/lib/utils";
import { ProductCardSkeleton } from "./product-card-skeleton";

function shimmer(className: string) {
  return cn(
    "bg-[linear-gradient(90deg,var(--color-surface-soft)_0%,var(--color-surface-dim)_50%,var(--color-surface-soft)_100%)] bg-[length:200%_100%] [animation:hero-skeleton-shimmer_1.2s_linear_infinite]",
    className,
  );
}

/** Route-level skeleton: gallery block, title/price/chips, and specs rows. */
export function ProductDetailSkeleton() {
  return (
    <div aria-hidden className="min-[864px]:pt-24 [direction:rtl]">
      <div className={shimmer("aspect-square w-full")} />

      <div className="px-16 pt-24 pb-16 text-center">
        <div className={shimmer("mx-auto h-[var(--text-title-18--line-height)] w-[60%] rounded-rounded")} />
        <div className={shimmer("mx-auto mt-12 h-[var(--text-title-16--line-height)] w-[35%] rounded-rounded")} />
        <div className="mt-16 flex justify-center gap-8">
          <div className={shimmer("h-24 w-[6.5rem] rounded-rounded")} />
          <div className={shimmer("h-24 w-[4.5rem] rounded-rounded")} />
          <div className={shimmer("h-24 w-[4.5rem] rounded-rounded")} />
        </div>
      </div>

      <div className="mx-16 mt-8 mb-16 overflow-hidden rounded-xl border border-border-mid-emphasis">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="flex gap-16 border-b border-border-mid-emphasis p-16 last:border-b-0">
            <div className={shimmer("h-16 w-1/3 rounded-rounded")} />
            <div className={shimmer("h-16 flex-1 rounded-rounded")} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Matches the similar-products rail's real geometry (5 slides at ≥1024). */
export function ProductsSliderSkeleton() {
  return (
    <div aria-hidden className="grid grid-cols-[repeat(5,minmax(0,1fr))] gap-12 px-16">
      {Array.from({ length: 5 }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}

/** Placeholder for the reviews section while it streams in. */
export function ProductReviewsSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-16 px-16">
      {Array.from({ length: 2 }, (_, index) => (
        <div key={index} className="flex items-center gap-8">
          <div className={shimmer("size-40 shrink-0 rounded-full")} />
          <div className="flex-1">
            <div className={shimmer("h-[var(--text-label-14--line-height)] w-[40%] rounded-rounded")} />
            <div className={shimmer("mt-4 h-[var(--text-body-14--line-height)] w-full rounded-rounded")} />
          </div>
        </div>
      ))}
    </div>
  );
}
