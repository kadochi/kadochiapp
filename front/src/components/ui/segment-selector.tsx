"use client";

import {
  useId,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { cva, type VariantProps } from "class-variance-authority";
import clsx from "clsx";

const segmentSelectorVariants = cva([
  "inline-flex w-full overflow-hidden rounded-m border border-border-high-emphasis bg-surface-background font-sans",
]);

const segmentVariants = cva([
  "group relative flex min-w-0 flex-1 border-e border-border-high-emphasis last:border-e-0",
  "has-[:disabled]:cursor-not-allowed",
]);

const segmentLabelVariants = cva(
  [
    "flex w-full cursor-pointer items-center justify-center whitespace-nowrap px-8 text-surface-neutral-high-emphasis",
    "transition-[background-color,color,box-shadow] duration-150 ease-out",
    "peer-focus-visible:ring-2 peer-focus-visible:ring-inset",
    "peer-disabled:cursor-not-allowed peer-disabled:bg-disable-container peer-disabled:text-on-disable",
  ],
  {
    variants: {
      tone: {
        primary: [
          "hover:peer-not-disabled:bg-surface",
          "peer-checked:bg-primary-container peer-checked:text-on-primary-container",
          "peer-focus-visible:ring-primary/40",
        ],
        secondary: [
          "hover:peer-not-disabled:bg-surface",
          "peer-checked:bg-secondary-container peer-checked:text-on-secondary-container",
          "peer-focus-visible:ring-secondary/40",
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
  ComponentPropsWithoutRef<"div">,
  "children" | "defaultValue" | "onChange"
> &
  VariantProps<typeof segmentLabelVariants> & {
    /** A list of uniquely valued options. */
    items: readonly SegmentItem[];
    /** Selected value in controlled mode. */
    value?: string;
    /** Initially selected value in uncontrolled mode. */
    defaultValue?: string;
    /** Called when the selected value changes. */
    onValueChange?: (value: string) => void;
    /** Groups the underlying radios and enables native form submission. */
    name?: string;
    /** Associates the underlying radios with a form outside their DOM tree. */
    form?: string;
    /** Requires a selection before the containing form can submit. */
    required?: boolean;
  };

function SegmentSelector({
  items,
  value,
  defaultValue,
  onValueChange,
  name,
  form,
  required,
  tone,
  size,
  className,
  dir = "rtl",
  ...props
}: SegmentSelectorProps) {
  const generatedName = useId();
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const selectedValue = value ?? uncontrolledValue;
  const groupName = name ?? generatedName;

  function handleValueChange(nextValue: string) {
    if (value === undefined) setUncontrolledValue(nextValue);
    onValueChange?.(nextValue);
  }

  return (
    <div
      {...props}
      dir={dir}
      role="radiogroup"
      className={clsx(segmentSelectorVariants(), className)}
    >
      {items.map(({ value: itemValue, label, disabled = false }) => {
        const checked = itemValue === selectedValue;

        return (
          <label key={itemValue} className={segmentVariants()}>
            <input
              checked={checked}
              className="peer sr-only"
              disabled={disabled}
              form={form}
              name={groupName}
              required={required}
              type="radio"
              value={itemValue}
              onChange={() => handleValueChange(itemValue)}
            />
            <span className={segmentLabelVariants({ tone, size })}>
              {label}
            </span>
          </label>
        );
      })}
    </div>
  );
}

export {
  SegmentSelector,
  segmentLabelVariants,
  segmentSelectorVariants,
  segmentVariants,
};
export type { SegmentItem, SegmentSelectorProps };
export default SegmentSelector;
