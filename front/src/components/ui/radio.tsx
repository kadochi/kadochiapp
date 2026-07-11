"use client";

import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { cva, type VariantProps } from "class-variance-authority";
import clsx from "clsx";

const radioVariants = cva(
  [
    "pointer-events-none inline-flex shrink-0 items-center justify-center rounded-full border-[1.5px] bg-surface-background text-transparent",
    "transition-[background-color,border-color,color,box-shadow] duration-150 ease-out",
    "peer-focus-visible:ring-2 peer-focus-visible:ring-secondary/30 peer-focus-visible:ring-offset-2",
    "peer-disabled:border-disable peer-disabled:bg-disable-container peer-checked:peer-disabled:border-disable peer-checked:peer-disabled:text-on-disable",
  ],
  {
    variants: {
      tone: {
        primary: [
          "border-border-high-emphasis",
          "group-hover:peer-not-disabled:border-primary",
          "peer-checked:border-primary peer-checked:bg-primary-container peer-checked:text-primary",
          "group-hover:peer-checked:peer-not-disabled:shadow-[0_0_0_2px_color-mix(in_oklab,var(--color-primary)_40%,transparent)]",
        ],
        secondary: [
          "border-border-high-emphasis",
          "group-hover:peer-not-disabled:border-secondary",
          "peer-checked:border-secondary peer-checked:bg-secondary-container peer-checked:text-secondary",
          "group-hover:peer-checked:peer-not-disabled:shadow-[0_0_0_2px_color-mix(in_oklab,var(--color-secondary)_40%,transparent)]",
        ],
      },
      size: {
        small: "size-20 [--radio-dot-size:12px]",
        medium: "size-24 [--radio-dot-size:16px]",
      },
      invalid: {
        true: [
          "!border-error",
          "group-hover:peer-not-disabled:!border-error",
          "peer-checked:!border-error peer-checked:!bg-error-container peer-checked:!text-error",
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

type RadioProps = Omit<
  ComponentPropsWithoutRef<"input">,
  "type" | "size" | "onChange"
> &
  VariantProps<typeof radioVariants> & {
    /** Content that labels the radio. Provide `aria-label` when omitted. */
    label?: ReactNode;
    /** Called when this radio becomes selected. */
    onCheckedChange?: (checked: boolean) => void;
  };

const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(
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
        type="radio"
        onChange={(event) => onCheckedChange?.(event.target.checked)}
      />
      <span aria-hidden="true" className={radioVariants({ tone, size, invalid })}>
        <span className="size-[var(--radio-dot-size)] rounded-full bg-current" />
      </span>
      {label ? <span>{label}</span> : null}
    </label>
  );
});

export { Radio, radioVariants };
export type { RadioProps };
