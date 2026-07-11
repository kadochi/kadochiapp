import type { ComponentPropsWithoutRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import clsx from "clsx";

const dividerVariants = cva("my-0 w-full shrink-0 border-0 p-0", {
  variants: {
    variant: {
      line: "h-px bg-border-low-emphasis",
      spacer: "bg-surface lg:bg-surface-background",
    },
    inset: {
      false: null,
      true: "mx-16 w-[calc(100%_-_var(--spacing-32))]",
    },
  },
  defaultVariants: {
    variant: "line",
    inset: false,
  },
});

const spacerSizeVariants = cva("", {
  variants: {
    size: {
      sm: "h-4 lg:h-8",
      md: "h-8 lg:h-16",
      lg: "h-16 lg:h-24",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

type DividerProps = Omit<ComponentPropsWithoutRef<"hr">, "size"> &
  VariantProps<typeof dividerVariants> &
  VariantProps<typeof spacerSizeVariants>;

/**
 * A horizontal separator or a responsive decorative spacer.
 *
 * `size` controls spacer height; it has no effect when `variant="line"`.
 */
function Divider({
  variant = "line",
  inset = false,
  size = "md",
  className,
  "aria-hidden": ariaHidden,
  ...props
}: DividerProps) {
  const classes = clsx(
    dividerVariants({ variant, inset }),
    variant === "spacer" && spacerSizeVariants({ size }),
    className,
  );

  if (variant === "spacer") {
    return <div {...props} aria-hidden={ariaHidden ?? true} className={classes} />;
  }

  return <hr {...props} className={classes} />;
}

export { Divider, dividerVariants, spacerSizeVariants };
export type { DividerProps };
