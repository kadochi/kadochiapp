"use client";

import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ComponentRef,
  type ReactNode,
} from "react";
import { Switch } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const toggleVariants = cva(
  [
    // Base layout: flex row, centered, padded
    "group inline-flex shrink-0 items-center rounded-rounded border-[1.5px] bg-surface-background",
    "p-[var(--toggle-gap)]",
    "transition-[background-color,border-color,box-shadow] duration-150 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    // Disabled styles
    "disabled:border-disable disabled:bg-disable-container",
    "disabled:[&>span]:bg-disable",
    "disabled:data-[state=checked]:border-disable disabled:data-[state=checked]:bg-disable-container",
    "disabled:data-[state=checked]:[&>span]:bg-disable",
  ],
  {
    variants: {
      tone: {
        primary: [
          "border-border-high-emphasis focus-visible:ring-primary/30",
          "group-hover:enabled:border-primary",
          "data-[state=checked]:border-primary data-[state=checked]:bg-primary",
          "data-[state=checked]:[&>span]:bg-on-primary",
          "group-hover:enabled:data-[state=checked]:shadow-[0_0_0_2px_color-mix(in_oklab,var(--color-primary)_30%,transparent)]",
        ],
        secondary: [
          "border-border-high-emphasis focus-visible:ring-secondary/30",
          "group-hover:enabled:border-secondary",
          "data-[state=checked]:border-secondary data-[state=checked]:bg-secondary",
          "data-[state=checked]:[&>span]:bg-on-secondary",
          "group-hover:enabled:data-[state=checked]:shadow-[0_0_0_2px_color-mix(in_oklab,var(--color-secondary)_30%,transparent)]",
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
  ComponentPropsWithoutRef<typeof Switch.Root>,
  "asChild"
> &
  VariantProps<typeof toggleVariants> & {
    label?: ReactNode;
  };

const Toggle = forwardRef<ComponentRef<typeof Switch.Root>, ToggleProps>(
  function Toggle({ className, label, tone, size, disabled, ...props }, ref) {
    return (
      <label
        className={cn(
          "group inline-flex w-fit cursor-pointer select-none items-center gap-12 font-sans text-label-12 font-regular text-surface-neutral-high-emphasis",
          "has-[:disabled]:cursor-not-allowed has-[:disabled]:text-on-disable",
          className,
        )}
      >
        <Switch.Root
          {...props}
          ref={ref}
          disabled={disabled}
          className={toggleVariants({ tone, size })}
        >
          {/* Animated spacer: flex-grow pushes the thumb to the opposite side */}
          <div
            aria-hidden="true"
            className={cn(
              "flex-grow-0 transition-[flex-grow] duration-150 ease-out",
              "group-data-[state=checked]:flex-grow-[1]",
            )}
          />
          <Switch.Thumb
            className={cn(
              "size-[var(--toggle-thumb-size)] shrink-0 rounded-full bg-disable",
              "transition-colors duration-150 ease-out",
            )}
          />
        </Switch.Root>
        {label ? <span>{label}</span> : null}
      </label>
    );
  },
);

export { Toggle, toggleVariants };
export type { ToggleProps };
