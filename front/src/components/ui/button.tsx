import { Slot } from "radix-ui";
import {
  Children,
  isValidElement,
  type ComponentProps,
  type ReactNode,
} from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  [
    "box-border inline-flex cursor-pointer items-center justify-center",
    "select-none rounded-rounded font-sans font-regular no-underline [direction:rtl]",
    "[transition-property:background-color,color,border-color,box-shadow,opacity]",
    "duration-150 [transition-timing-function:ease]",
    "[&_img]:block [&_img]:size-[var(--button-icon-size)]",
    "[&_svg]:block [&_svg]:size-[var(--button-icon-size)]",
  ],
  {
    variants: {
      variant: {
        "primary-filled": [
          "border-0 bg-primary text-on-primary",
          "[background-image:linear-gradient(to_left,var(--color-primary),var(--color-primary-gradient))]",
          "not-data-disabled:not-data-loading:hover:[background-image:linear-gradient(to_left,var(--color-on-primary-container),var(--color-primary))]",
          "not-data-disabled:not-data-loading:active:[background-image:linear-gradient(to_left,color-mix(in_oklab,var(--color-primary)_84%,black),color-mix(in_oklab,var(--color-primary)_84%,black))]",
        ],
        "primary-tonal": [
          "border-0 bg-primary-container text-on-primary-container",
          "not-data-disabled:not-data-loading:hover:[filter:saturate(1.04)_brightness(0.98)]",
          "not-data-disabled:not-data-loading:active:[filter:saturate(1.08)_brightness(0.96)]",
        ],
        "secondary-filled": [
          "border-0 bg-secondary text-on-secondary",
          "[background-image:linear-gradient(to_left,var(--color-secondary),var(--color-secondary-gradient))]",
          "not-data-disabled:not-data-loading:hover:[background-image:linear-gradient(to_left,var(--color-on-secondary-container),var(--color-secondary))]",
          "not-data-disabled:not-data-loading:active:[background-image:linear-gradient(to_left,color-mix(in_oklab,var(--color-secondary)_84%,black),color-mix(in_oklab,var(--color-secondary)_84%,black))]",
        ],
        "secondary-tonal": [
          "border-0 bg-secondary-container text-on-secondary-container",
          "not-data-disabled:not-data-loading:hover:[filter:saturate(1.04)_brightness(0.98)]",
          "not-data-disabled:not-data-loading:active:[filter:saturate(1.08)_brightness(0.96)]",
        ],
        "tertiary-outline": [
          "border border-solid border-border-high-emphasis bg-transparent text-text-primary",
          "not-data-disabled:not-data-loading:hover:bg-[color-mix(in_oklab,var(--color-border-high-emphasis)_10%,transparent)]",
          "not-data-disabled:not-data-loading:active:bg-[color-mix(in_oklab,var(--color-border-high-emphasis)_20%,transparent)]",
        ],
        "link-ghost": [
          "border-0 bg-transparent text-text-primary",
          "not-data-disabled:not-data-loading:active:opacity-90",
        ],
      },
      size: {
        small:
          "h-40 min-h-40 max-h-40 gap-6 px-12 py-12 text-label-14 [--button-icon-size:16px]",
        medium:
          "h-48 min-h-48 max-h-48 gap-6 px-12 py-[14px] text-label-16 [--button-icon-size:24px]",
        large:
          "h-56 min-h-56 max-h-56 gap-8 px-16 py-18 text-label-16 [--button-icon-size:24px]",
      },
      disabled: {
        true: "pointer-events-none cursor-not-allowed",
        false: null,
      },
      loading: {
        true: null,
        false: null,
      },
    },
    compoundVariants: [
      {
        variant: [
          "primary-filled",
          "primary-tonal",
          "secondary-filled",
          "secondary-tonal",
          "link-ghost",
        ],
        disabled: true,
        className:
          "data-disabled:border-0 data-disabled:bg-disable-container data-disabled:bg-none data-disabled:text-on-disable data-disabled:[filter:none]",
      },
      {
        variant: "tertiary-outline",
        disabled: true,
        className:
          "data-disabled:border data-disabled:border-disable data-disabled:bg-disable-container data-disabled:text-on-disable data-disabled:[filter:none]",
      },
    ],
    defaultVariants: {
      variant: "primary-filled",
      size: "medium",
      disabled: false,
      loading: false,
    },
  },
);

type ButtonVariantProps = VariantProps<typeof buttonVariants>;

type ButtonProps = Omit<ComponentProps<"button">, "disabled"> &
  Omit<ButtonVariantProps, "disabled" | "loading"> & {
    asChild?: boolean;
    disabled?: boolean;
    loading?: boolean;
  };

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="size-[1em] shrink-0 animate-spin rounded-full border-2 border-solid border-current border-t-transparent"
    />
  );
}

function LoadingContent({ children }: { children: ReactNode }) {
  return (
    <>
      <Spinner />
      <span className="sr-only">{children}</span>
    </>
  );
}

function Button({
  asChild = false,
  variant,
  size,
  loading = false,
  disabled = false,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const classes = cn(
    buttonVariants({ variant, size, disabled: isDisabled, loading }),
    className,
  );

  const Comp = asChild ? Slot.Root : "button";
  const child = asChild ? Children.only(children) : undefined;
  const loadingChildren =
    asChild && isValidElement<{ children?: ReactNode }>(child)
      ? child.props.children
      : children;

  return (
    <Comp
      {...props}
      aria-busy={loading || undefined}
      aria-disabled={asChild ? isDisabled || undefined : undefined}
      className={classes}
      data-disabled={isDisabled || undefined}
      data-loading={loading || undefined}
      disabled={asChild ? undefined : isDisabled}
      tabIndex={asChild && isDisabled ? -1 : undefined}
      type={type}
    >
      {loading ? <LoadingContent>{loadingChildren}</LoadingContent> : children}
    </Comp>
  );
}

export { Button, buttonVariants };
export type { ButtonProps };
