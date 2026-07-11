"use client";

import { type ComponentPropsWithoutRef, type ReactNode } from "react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const segmentSelectorVariants = cva([
  "inline-flex w-full overflow-hidden rounded-m border border-border-high-emphasis bg-surface-background font-sans",
]);

const segmentItemVariants = cva(
  [
    "group relative flex min-w-0 flex-1 cursor-pointer items-center justify-center whitespace-nowrap border-e border-border-high-emphasis px-8 text-surface-neutral-high-emphasis last:border-e-0",
    "transition-[background-color,color,box-shadow] duration-150 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset",
    "disabled:cursor-not-allowed disabled:bg-disable-container disabled:text-on-disable",
  ],
  {
    variants: {
      tone: {
        primary: [
          "enabled:hover:bg-surface",
          "data-[state=checked]:bg-primary-container data-[state=checked]:text-on-primary-container",
          "focus-visible:ring-primary/40",
        ],
        secondary: [
          "enabled:hover:bg-surface",
          "data-[state=checked]:bg-secondary-container data-[state=checked]:text-on-secondary-container",
          "focus-visible:ring-secondary/40",
        ],
      },
      size: {
        sm: "py-8",
        md: "py-12",
        lg: "py-16",
      },
    },
    defaultVariants: {
      tone: "secondary",
      size: "md",
    },
  },
);

type SegmentItem = {
  /** Unique value submitted when this item is selected. */
  value: string;
  /** Visible content for this item. */
  label: ReactNode;
  /** Prevents this item from being selected. */
  disabled?: boolean;
};

type SegmentSelectorProps = Omit<
  ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>,
  "children" | "asChild"
> &
  VariantProps<typeof segmentItemVariants> & {
    /** A list of uniquely valued options. */
    items: readonly SegmentItem[];
  };

function SegmentSelector({
  items,
  tone,
  size,
  className,
  dir = "rtl",
  ...props
}: SegmentSelectorProps) {
  return (
    <RadioGroupPrimitive.Root
      {...props}
      dir={dir}
      orientation="horizontal"
      className={cn(segmentSelectorVariants(), className)}
    >
      {items.map(({ value, label, disabled = false }) => (
        <RadioGroupPrimitive.Item
          key={value}
          value={value}
          disabled={disabled}
          className={segmentItemVariants({ tone, size })}
        >
          {label}
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  );
}

export { SegmentSelector, segmentItemVariants, segmentSelectorVariants };
export type { SegmentItem, SegmentSelectorProps };
export default SegmentSelector;
