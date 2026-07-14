import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

export type PriceSize = "L" | "M";
export type NormalSize = PriceSize;
export type DiscountSize = PriceSize;
export type PriceOrientation = "horizontal" | "vertical";
export type Orientation = PriceOrientation;

const formatPrice = (amount: number) =>
  new Intl.NumberFormat("fa-IR").format(Math.max(0, Math.floor(amount)));

const formatDiscountValue = (amount: number) => amount.toLocaleString("fa-IR");

const normalPriceVariants = cva(
  "inline-flex items-baseline gap-6 [direction:rtl]",
  {
    variants: {
      size: {
        L: "[&_[data-price-amount]]:text-body-16 [&_[data-price-amount]]:font-bold [&_[data-price-amount]]:leading-[var(--text-body-16--line-height)] [&_[data-price-amount]]:text-surface-neutral-high-emphasis [&_[data-price-currency]]:text-label-14 [&_[data-price-currency]]:font-regular [&_[data-price-currency]]:leading-[var(--text-label-14--line-height)] [&_[data-price-currency]]:text-surface-neutral-low-emphasis",
        M: "[&_[data-price-amount]]:text-label-14 [&_[data-price-amount]]:font-bold [&_[data-price-amount]]:leading-[var(--text-label-14--line-height)] [&_[data-price-amount]]:text-surface-neutral-high-emphasis [&_[data-price-currency]]:text-label-12 [&_[data-price-currency]]:font-regular [&_[data-price-currency]]:leading-[var(--text-label-12--line-height)] [&_[data-price-currency]]:text-surface-neutral-low-emphasis",
      },
    },
    defaultVariants: { size: "L" },
  },
);

export type NormalPriceProps = {
  amount: number;
  size?: NormalSize;
  className?: string;
  currencyLabel?: string;
};

/** Displays a single price using the app's Persian currency presentation. */
export function NormalPrice({
  amount,
  size = "L",
  className,
  currencyLabel = "تومان",
}: Readonly<NormalPriceProps>) {
  return (
    <span className={cn(normalPriceVariants({ size }), className)} dir="rtl">
      <span data-price-amount>{formatPrice(amount)}</span>
      <span data-price-currency>{currencyLabel}</span>
    </span>
  );
}

const discountPriceVariants = cva("inline-flex [direction:rtl]", {
  variants: {
    size: {
      L: "[&_[data-current-price]]:text-label-16 [&_[data-current-price]]:font-bold [&_[data-current-price]]:leading-[var(--text-label-16--line-height)] [&_[data-currency-label]]:text-label-14 [&_[data-currency-label]]:leading-[var(--text-label-14--line-height)] [&_[data-currency-label]]:text-surface-neutral-low-emphasis [&_[data-previous-price]]:text-label-14 [&_[data-previous-price]]:leading-[var(--text-label-14--line-height)]",
      M: "[&_[data-current-price]]:text-label-14 [&_[data-current-price]]:font-bold [&_[data-current-price]]:leading-[var(--text-label-14--line-height)] [&_[data-currency-label]]:text-label-12 [&_[data-currency-label]]:leading-[var(--text-label-12--line-height)] [&_[data-currency-label]]:text-surface-neutral-low-emphasis [&_[data-previous-price]]:text-label-12 [&_[data-previous-price]]:leading-[var(--text-label-12--line-height)]",
    },
    orientation: {
      horizontal: "items-center gap-12",
      vertical: "flex-col gap-4",
    },
    alignment: {
      right: "items-start",
      center: "items-center",
      none: null,
    },
  },
  defaultVariants: {
    size: "L",
    orientation: "horizontal",
    alignment: "none",
  },
});

export type DiscountPriceProps = {
  current: number;
  previous: number;
  offPercent: number;
  size?: DiscountSize;
  orientation?: PriceOrientation;
  currencyLabel?: string;
  showArrowOnLargeH?: boolean;
};

function PreviousPrice({
  previous,
  offPercent,
  currencyLabel,
  rightAligned = false,
  showBadge = false,
}: Readonly<{
  previous: number;
  offPercent: number;
  currencyLabel: string;
  rightAligned?: boolean;
  showBadge?: boolean;
}>) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-6 text-surface-neutral-low-emphasis",
        rightAligned && "justify-end [direction:rtl]",
      )}
    >
      <span data-previous-price className="line-through">
        {formatDiscountValue(previous)}
      </span>
      <span data-currency-label>{currencyLabel}</span>
      {showBadge ? <DiscountBadge offPercent={offPercent} /> : null}
    </div>
  );
}

function CurrentPrice({
  current,
  currencyLabel,
}: Readonly<{ current: number; currencyLabel: string }>) {
  return (
    <div className="inline-flex items-center gap-6">
      <span data-current-price>{formatDiscountValue(current)}</span>
      <span data-currency-label>{currencyLabel}</span>
    </div>
  );
}

function DiscountBadge({ offPercent }: Readonly<{ offPercent: number }>) {
  return (
    <span className="inline-flex items-center justify-center rounded-rounded bg-error px-6 py-2 text-label-12 leading-[var(--text-label-12--line-height)] text-on-error">
      {formatDiscountValue(offPercent)}٪
    </span>
  );
}

function PriceArrow() {
  return (
    <span className="inline-flex items-center" aria-hidden>
      <svg viewBox="0 0 24 24" className="size-20">
        <path
          d="M14.7 6.3 9 12l5.7 5.7 1.4-1.4L11.8 12l4.3-4.3-1.4-1.4z"
          fill="currentColor"
        />
      </svg>
    </span>
  );
}

/** Displays the original price, discount percentage, and discounted price. */
export function DiscountPrice({
  current,
  previous,
  offPercent,
  size = "L",
  orientation = "horizontal",
  currencyLabel = "تومان",
  showArrowOnLargeH = false,
}: Readonly<DiscountPriceProps>) {
  const isHorizontal = orientation === "horizontal";
  const isLarge = size === "L";

  if (isHorizontal) {
    return (
      <div
        className={discountPriceVariants({ size, orientation })}
        dir="rtl"
      >
        <PreviousPrice
          previous={previous}
          offPercent={offPercent}
          currencyLabel={currencyLabel}
        />
        <DiscountBadge offPercent={offPercent} />
        {isLarge && showArrowOnLargeH ? <PriceArrow /> : null}
        <CurrentPrice current={current} currencyLabel={currencyLabel} />
      </div>
    );
  }

  return (
    <div
      className={discountPriceVariants({
        size,
        orientation,
        alignment: isLarge ? "right" : "center",
      })}
      dir="rtl"
    >
      {isLarge ? (
        <>
          <PreviousPrice
            previous={previous}
            offPercent={offPercent}
            currencyLabel={currencyLabel}
            rightAligned
            showBadge
          />
          <div className="inline-flex items-center justify-end gap-8">
            <CurrentPrice current={current} currencyLabel={currencyLabel} />
          </div>
        </>
      ) : (
        <>
          <div className="inline-flex items-center justify-center gap-8">
            <CurrentPrice current={current} currencyLabel={currencyLabel} />
          </div>
          <PreviousPrice
            previous={previous}
            offPercent={offPercent}
            currencyLabel={currencyLabel}
            showBadge
          />
        </>
      )}
    </div>
  );
}

const sumPriceVariants = cva(
  "text-surface-neutral-high-emphasis [direction:rtl]",
  {
    variants: {
      orientation: {
        horizontal: "inline-flex items-center gap-12",
        vertical: "inline-flex flex-col items-start gap-4 text-right",
      },
      separate: {
        true: null,
        false: null,
      },
    },
    compoundVariants: [
      {
        orientation: "horizontal",
        separate: true,
        className: "w-full justify-between",
      },
    ],
    defaultVariants: { orientation: "horizontal", separate: false },
  },
);

export type SumPriceProps = {
  amount: number;
  label?: string;
  currencyLabel?: string;
  orientation?: PriceOrientation;
  separate?: boolean;
};

/** Displays a labelled total for basket and checkout summaries. */
export function SumPrice({
  amount,
  label = "جمع کل",
  currencyLabel = "تومان",
  orientation = "horizontal",
  separate = false,
}: Readonly<SumPriceProps>) {
  return (
    <div className={sumPriceVariants({ orientation, separate })}>
      <span className="text-label-14 leading-[var(--text-label-14--line-height)] text-surface-neutral-low-emphasis">
        {label}
      </span>
      <div className="inline-flex items-center gap-6">
        <span className="text-label-16 font-bold">{formatDiscountValue(amount)}</span>
        <span className="text-label-14 text-surface-neutral-low-emphasis">
          {currencyLabel}
        </span>
      </div>
    </div>
  );
}

export type PriceProps = {
  current: number;
  previous?: number | null;
  offPercent?: number | null;
  size?: DiscountSize;
  orientation?: PriceOrientation;
  currencyLabel?: string;
  showArrowOnLargeH?: boolean;
};

/** Chooses normal or discounted price presentation from the available values. */
export default function Price({
  current,
  previous,
  offPercent,
  size = "M",
  orientation = "vertical",
  currencyLabel = "تومان",
  showArrowOnLargeH = false,
}: Readonly<PriceProps>) {
  const hasDiscount = previous != null && offPercent != null && offPercent > 0;

  return hasDiscount ? (
    <DiscountPrice
      current={current}
      previous={previous}
      offPercent={offPercent}
      size={size}
      orientation={orientation}
      currencyLabel={currencyLabel}
      showArrowOnLargeH={showArrowOnLargeH}
    />
  ) : (
    <NormalPrice amount={current} size={size} currencyLabel={currencyLabel} />
  );
}

export { Price };
