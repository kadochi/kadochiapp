"use client";

import { Slot } from "radix-ui";
import {
  type ComponentPropsWithoutRef,
  type MouseEventHandler,
  type ReactNode,
} from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";
import { X } from "lucide-react";

const chipVariants = cva(
  [
    "inline-flex w-fit items-center justify-center whitespace-nowrap rounded-rounded border font-sans font-regular no-underline [direction:rtl]",
    "transition-[background-color,border-color,color,box-shadow] duration-150 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/30 focus-visible:ring-offset-2",
    "[&[aria-disabled=true]]:pointer-events-none [&[aria-disabled=true]]:cursor-not-allowed",
  ],
  {
    variants: {
      variant: {
        outline: [
          "border-border-high-emphasis bg-surface-soft text-surface-neutral-high-emphasis",
          "[&:not([aria-disabled=true]):hover]:border-surface-neutral-mid-emphasis",
          "[&:not([aria-disabled=true]):active]:bg-surface-dim",
        ],
        selected: [
          "border-secondary bg-secondary-container text-surface-neutral-high-emphasis",
          "[&:not([aria-disabled=true]):hover]:bg-[color-mix(in_oklab,var(--color-secondary-container)_88%,var(--color-secondary))]",
          "[&:not([aria-disabled=true]):active]:bg-[color-mix(in_oklab,var(--color-secondary-container)_76%,var(--color-secondary))]",
        ],
      },
      size: {
        sm: "h-28 gap-4 px-12 text-label-12 [--chip-icon-size:14px] [--chip-remove-size:20px]",
        md: "h-32 gap-6 px-12 text-label-14 [--chip-icon-size:16px] [--chip-remove-size:24px]",
      },
      disabled: {
        true: "border-disable bg-disable-container text-on-disable",
        false: null,
      },
    },
    defaultVariants: {
      variant: "outline",
      size: "md",
      disabled: false,
    },
  },
);

type ChipOwnProps = VariantProps<typeof chipVariants> & {
  /** Render the root element supplied as the only child (for example, an anchor). */
  asChild?: boolean;
  /** Decorative content displayed before the label. */
  leadingIcon?: ReactNode;
  /** Optional metadata displayed after the label. */
  badge?: ReactNode;
  /** Decorative content displayed at the end of the chip. */
  trailingIcon?: ReactNode;
  /** Enables the accessible remove control. */
  onRemove?: MouseEventHandler<HTMLButtonElement>;
  /** Accessible name for the remove control. */
  removeLabel?: string;
};

type ChipProps = Omit<ComponentPropsWithoutRef<"span">, "children" | "color"> &
  ChipOwnProps & {
    children?: ReactNode;
  };

function Chip({
  asChild = false,
  variant,
  size,
  disabled = false,
  leadingIcon,
  badge,
  trailingIcon,
  onRemove,
  removeLabel = "Remove",
  className,
  children,
  ...props
}: ChipProps) {
  const isDisabled = disabled === true;

  if (asChild && onRemove) {
    throw new Error(
      "Chip cannot use onRemove with asChild because it would nest interactive elements.",
    );
  }

  const leading = leadingIcon ? (
    <span
      aria-hidden="true"
      className="inline-flex size-[var(--chip-icon-size)] shrink-0 items-center justify-center [&>svg]:size-full"
    >
      {leadingIcon}
    </span>
  ) : null;

  const badgeElement = badge ? (
    <span className="inline-flex min-w-20 items-center justify-center rounded-rounded bg-secondary px-4 py-2 text-label-10 leading-none text-on-secondary">
      {badge}
    </span>
  ) : null;

  const trailing = trailingIcon ? (
    <span
      aria-hidden="true"
      className="inline-flex size-[var(--chip-icon-size)] shrink-0 items-center justify-center [&>svg]:size-full"
    >
      {trailingIcon}
    </span>
  ) : null;

  const remove = onRemove ? (
    <button
      aria-label={removeLabel}
      className="-me-2 inline-flex size-[var(--chip-remove-size)] shrink-0 items-center justify-center rounded-full text-current transition-colors hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current disabled:pointer-events-none"
      disabled={isDisabled}
      type="button"
      onClick={onRemove}
    >
      <X aria-hidden="true" className="size-[var(--chip-icon-size)]" />
    </button>
  ) : null;

  const classes = cn(
    chipVariants({ variant, size, disabled: isDisabled }),
    className,
  );

  if (asChild) {
    return (
      <Slot.Root
        {...props}
        aria-disabled={isDisabled || undefined}
        className={classes}
        data-disabled={isDisabled || undefined}
      >
        {leading}
        <Slot.Slottable>{children}</Slot.Slottable>
        {badgeElement}
        {trailing}
      </Slot.Root>
    );
  }

  return (
    <span
      {...props}
      aria-disabled={isDisabled || undefined}
      className={classes}
      data-disabled={isDisabled || undefined}
    >
      {leading}
      <span>{children}</span>
      {badgeElement}
      {trailing}
      {remove}
    </span>
  );
}

export { Chip, chipVariants };
export type { ChipProps };
