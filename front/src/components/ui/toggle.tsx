"use client";

import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { cva, type VariantProps } from "class-variance-authority";
import clsx from "clsx";

const toggleVariants = cva(
  [
    "pointer-events-none relative inline-flex shrink-0 rounded-rounded border-[1.5px] bg-surface-background",
    "transition-[background-color,border-color,box-shadow] duration-150 ease-out",
    "peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2",
    "peer-disabled:border-disable peer-disabled:bg-disable-container",
    "peer-checked:[&>span]:[inset-inline-start:calc(100%-var(--toggle-thumb-size)-var(--toggle-gap))]",
    "peer-disabled:[&>span]:bg-disable",
  ],
  {
    variants: {
      tone: {
        primary: [
          "border-border-high-emphasis peer-focus-visible:ring-primary/30",
          "group-hover:peer-not-disabled:border-primary",
          "peer-checked:border-primary peer-checked:bg-primary",
          "peer-checked:[&>span]:bg-on-primary",
          "group-hover:peer-checked:peer-not-disabled:shadow-[0_0_0_2px_color-mix(in_oklab,var(--color-primary)_30%,transparent)]",
        ],
        secondary: [
          "border-border-high-emphasis peer-focus-visible:ring-secondary/30",
          "group-hover:peer-not-disabled:border-secondary",
          "peer-checked:border-secondary peer-checked:bg-secondary",
          "peer-checked:[&>span]:bg-on-secondary",
          "group-hover:peer-checked:peer-not-disabled:shadow-[0_0_0_2px_color-mix(in_oklab,var(--color-secondary)_30%,transparent)]",
        ],
      },
      size: {
        sm: "h-24 w-40 [--toggle-gap:3px] [--toggle-thumb-size:18px]",
        md: "h-32 w-56 [--toggle-gap:4px] [--toggle-thumb-size:24px]",
      },
    },
    defaultVariants: {
      tone: "secondary",
      size: "md",
    },
  },
);

type ToggleProps = Omit<
  ComponentPropsWithoutRef<"input">,
  "type" | "size" | "onChange"
> &
  VariantProps<typeof toggleVariants> & {
    /** Content that labels the switch. Provide `aria-label` when omitted. */
    label?: ReactNode;
    /** Called whenever the switch value changes. */
    onCheckedChange?: (checked: boolean) => void;
  };

const Toggle = forwardRef<HTMLInputElement, ToggleProps>(function Toggle(
  {
    className,
    label,
    tone,
    size,
    disabled,
    onCheckedChange,
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
        className="peer sr-only"
        disabled={disabled}
        role="switch"
        type="checkbox"
        onChange={(event) => onCheckedChange?.(event.target.checked)}
      />
      <span aria-hidden="true" className={toggleVariants({ tone, size })}>
        <span
          className={clsx(
            "absolute top-[var(--toggle-gap)] size-[var(--toggle-thumb-size)] rounded-full bg-disable",
            "[inset-inline-start:var(--toggle-gap)]",
            "transition-[inset-inline-start,background-color] duration-150 ease-out",
          )}
        />
      </span>
      {label ? <span>{label}</span> : null}
    </label>
  );
});

export { Toggle, toggleVariants };
export type { ToggleProps };
