"use client";

import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ComponentRef,
  type ReactNode,
} from "react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";
import { Check } from "lucide-react";

const checkboxVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center rounded-xs border-[1.5px] text-transparent",
    "transition-[background-color,border-color,color,box-shadow] duration-150 ease-out",
    "[&_svg]:size-[var(--checkbox-icon-size)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/30 focus-visible:ring-offset-2",
    "disabled:border-disable disabled:bg-disable-container disabled:text-on-disable",
    // Disabled overrides the checked tone (compound wins on specificity).
    "disabled:data-[state=checked]:border-disable disabled:data-[state=checked]:bg-disable-container disabled:data-[state=checked]:text-on-disable",
  ],
  {
    variants: {
      tone: {
        primary: [
          "border-border-high-emphasis bg-surface-background",
          "group-hover:enabled:border-primary",
          "data-[state=checked]:border-primary data-[state=checked]:bg-primary-container data-[state=checked]:text-on-primary-container",
          "group-hover:enabled:data-[state=checked]:shadow-[0_0_0_2px_color-mix(in_oklab,var(--color-primary)_40%,transparent)]",
        ],
        secondary: [
          "border-border-high-emphasis bg-surface-background",
          "group-hover:enabled:border-secondary",
          "data-[state=checked]:border-secondary data-[state=checked]:bg-secondary-container data-[state=checked]:text-on-secondary-container",
          "group-hover:enabled:data-[state=checked]:shadow-[0_0_0_2px_color-mix(in_oklab,var(--color-secondary)_40%,transparent)]",
        ],
      },
      size: {
        small: "size-20 [--checkbox-icon-size:14px]",
        medium: "size-24 [--checkbox-icon-size:16px]",
      },
      invalid: {
        true: [
          "border-error",
          "group-hover:enabled:border-error",
          "data-[state=checked]:border-error data-[state=checked]:bg-error-container data-[state=checked]:text-on-error-container",
        ],
        false: null,
      },
    },
    defaultVariants: {
      tone: "secondary",
      size: "medium",
      invalid: false,
    },
  },
);

type CheckboxProps = Omit<
  ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>,
  "asChild" | "onCheckedChange"
> &
  Omit<VariantProps<typeof checkboxVariants>, "invalid"> & {
    /** Content that labels the checkbox. Provide `aria-label` when omitted. */
    label?: ReactNode;
    /** Marks the control as invalid. */
    invalid?: boolean;
    /** Called whenever the checkbox value changes. */
    onCheckedChange?: (checked: boolean) => void;
  };

const Checkbox = forwardRef<
  ComponentRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(function Checkbox(
  {
    className,
    label,
    tone,
    size,
    invalid = false,
    disabled,
    onCheckedChange,
    "aria-invalid": ariaInvalid,
    ...props
  },
  ref,
) {
  return (
    <label
      className={cn(
        "group inline-flex w-fit cursor-pointer select-none items-center gap-12 font-sans text-label-12 font-regular text-surface-neutral-high-emphasis",
        "has-[:disabled]:cursor-not-allowed has-[:disabled]:text-on-disable",
        className,
      )}
    >
      <CheckboxPrimitive.Root
        {...props}
        ref={ref}
        aria-invalid={invalid || ariaInvalid || undefined}
        disabled={disabled}
        className={checkboxVariants({ tone, size, invalid })}
        onCheckedChange={
          onCheckedChange
            ? (checked) => onCheckedChange(checked === true)
            : undefined
        }
      >
        <CheckboxPrimitive.Indicator forceMount className="data-[state=unchecked]:text-transparent">
          <Check strokeWidth={2.5} />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      {label ? <span>{label}</span> : null}
    </label>
  );
});

export { Checkbox, checkboxVariants };
export type { CheckboxProps };
