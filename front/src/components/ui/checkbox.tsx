"use client";

import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { cva, type VariantProps } from "class-variance-authority";
import clsx from "clsx";
import { Check } from "lucide-react";

const checkboxVariants = cva(
  [
    "pointer-events-none inline-flex shrink-0 items-center justify-center rounded-xs border-[1.5px] text-transparent",
    "transition-[background-color,border-color,color,box-shadow] duration-150 ease-out",
    "[&>svg]:size-[var(--checkbox-icon-size)]",
    "peer-focus-visible:ring-2 peer-focus-visible:ring-secondary/30 peer-focus-visible:ring-offset-2",
    "peer-disabled:!border-disable peer-disabled:!bg-disable-container peer-disabled:!text-on-disable",
  ],
  {
    variants: {
      tone: {
        primary: [
          "border-border-high-emphasis bg-surface-background",
          "group-hover:peer-not-disabled:border-primary",
          "peer-checked:border-primary peer-checked:bg-primary-container peer-checked:text-on-primary-container",
          "group-hover:peer-checked:peer-not-disabled:shadow-[0_0_0_2px_color-mix(in_oklab,var(--color-primary)_40%,transparent)]",
        ],
        secondary: [
          "border-border-high-emphasis bg-surface-background",
          "group-hover:peer-not-disabled:border-secondary",
          "peer-checked:border-secondary peer-checked:bg-secondary-container peer-checked:text-on-secondary-container",
          "group-hover:peer-checked:peer-not-disabled:shadow-[0_0_0_2px_color-mix(in_oklab,var(--color-secondary)_40%,transparent)]",
        ],
      },
      size: {
        small: "size-20 [--checkbox-icon-size:14px]",
        medium: "size-24 [--checkbox-icon-size:16px]",
      },
      invalid: {
        true: [
          "!border-error",
          "group-hover:peer-not-disabled:!border-error",
          "peer-checked:!border-error peer-checked:!bg-error-container peer-checked:!text-on-error-container",
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
  ComponentPropsWithoutRef<"input">,
  "type" | "size" | "onChange"
> &
  VariantProps<typeof checkboxVariants> & {
    /** Content that labels the checkbox. Provide `aria-label` when omitted. */
    label?: ReactNode;
    /** Called whenever the native checkbox value changes. */
    onCheckedChange?: (checked: boolean) => void;
  };

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
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
      className={clsx(
        "group inline-flex w-fit cursor-pointer select-none items-center gap-12 font-sans text-label-12 font-regular text-surface-neutral-high-emphasis",
        "has-[:disabled]:cursor-not-allowed has-[:disabled]:text-on-disable",
        className,
      )}
    >
      <input
        {...props}
        ref={ref}
        aria-invalid={invalid || ariaInvalid || undefined}
        className="peer sr-only"
        disabled={disabled}
        type="checkbox"
        onChange={(event) => onCheckedChange?.(event.target.checked)}
      />
      <span aria-hidden="true" className={checkboxVariants({ tone, size, invalid })}>
        <Check strokeWidth={2.5} />
      </span>
      {label ? <span>{label}</span> : null}
    </label>
  );
});

export { Checkbox, checkboxVariants };
export type { CheckboxProps };
