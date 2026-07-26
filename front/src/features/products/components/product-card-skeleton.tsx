import { cn } from "@/lib/utils";

function shimmer(className: string) {
  return cn(
    "bg-[linear-gradient(90deg,var(--color-surface-soft)_0%,var(--color-surface-dim)_50%,var(--color-surface-soft)_100%)] bg-[length:200%_100%] [animation:hero-skeleton-shimmer_1.2s_linear_infinite]",
    className,
  );
}

/** Loading placeholder matching ProductCard's layout. */
export function ProductCardSkeleton() {
  return (
    <div aria-hidden className="w-full [direction:rtl]">
      <div className={shimmer("aspect-[1/1.2] w-full rounded-[var(--radius-l)]")} />

      <div className="min-h-[104px] p-16 text-center">
        <div className={shimmer("mx-auto h-[calc(var(--text-label-14--line-height)*2)] w-[72%] rounded-rounded")} />
        <div className="mx-auto mt-8 h-32 w-[52%]">
          <div className={shimmer("h-[var(--text-label-14--line-height)] w-full rounded-rounded")} />
          <div className={shimmer("mt-4 h-[var(--text-label-14--line-height)] w-[68%] rounded-rounded")} />
        </div>
      </div>
    </div>
  );
}
