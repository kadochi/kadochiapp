import { Slot } from "@radix-ui/react-slot";
import {
  Children,
  isValidElement,
  type ComponentProps,
  type ReactNode,
} from "react";
import { cva, type VariantProps } from "class-variance-authority";
import clsx from "clsx";

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
          "[&:not(:disabled):not([aria-disabled=true]):not([data-loading=true]):hover]:[background-image:linear-gradient(to_left,var(--color-on-primary-container),var(--color-primary))]",
          "[&:not(:disabled):not([aria-disabled=true]):not([data-loading=true]):active]:[background-image:linear-gradient(to_left,color-mix(in_oklab,var(--color-primary)_84%,black),color-mix(in_oklab,var(--color-primary)_84%,black))]",
        ],
        "primary-tonal": [
          "border-0 bg-primary-container text-on-primary-container",
          "[&:not(:disabled):not([aria-disabled=true]):not([data-loading=true]):hover]:[filter:saturate(1.04)_brightness(0.98)]",
          "[&:not(:disabled):not([aria-disabled=true]):not([data-loading=true]):active]:[filter:saturate(1.08)_brightness(0.96)]",
        ],
        "secondary-filled": [
          "border-0 bg-secondary text-on-secondary",
          "[background-image:linear-gradient(to_left,var(--color-secondary),var(--color-secondary-gradient))]",
          "[&:not(:disabled):not([aria-disabled=true]):not([data-loading=true]):hover]:[background-image:linear-gradient(to_left,var(--color-on-secondary-container),var(--color-secondary))]",
          "[&:not(:disabled):not([aria-disabled=true]):not([data-loading=true]):active]:[background-image:linear-gradient(to_left,color-mix(in_oklab,var(--color-secondary)_84%,black),color-mix(in_oklab,var(--color-secondary)_84%,black))]",
        ],
        "secondary-tonal": [
          "border-0 bg-secondary-container text-on-secondary-container",
          "[&:not(:disabled):not([aria-disabled=true]):not([data-loading=true]):hover]:[filter:saturate(1.04)_brightness(0.98)]",
          "[&:not(:disabled):not([aria-disabled=true]):not([data-loading=true]):active]:[filter:saturate(1.08)_brightness(0.96)]",
        ],
        "tertiary-outline": [
          "border border-solid border-border-high-emphasis bg-transparent text-text-primary",
          "[&:not(:disabled):not([aria-disabled=true]):not([data-loading=true]):hover]:bg-[color-mix(in_oklab,var(--color-border-high-emphasis)_10%,transparent)]",
          "[&:not(:disabled):not([aria-disabled=true]):not([data-loading=true]):active]:bg-[color-mix(in_oklab,var(--color-border-high-emphasis)_20%,transparent)]",
        ],
        "link-ghost": [
          "border-0 bg-transparent text-text-primary",
          "[&:not(:disabled):not([aria-disabled=true]):not([data-loading=true]):active]:opacity-90",
        ],
      },
      size: {
        small:
          "h-[40px] min-h-[40px] max-h-[40px] gap-[6px] px-[12px] py-[12px] text-label-14 [--button-icon-size:16px]",
        medium:
          "h-[48px] min-h-[48px] max-h-[48px] gap-[6px] px-[12px] py-[14px] text-label-16 [--button-icon-size:24px]",
        large:
          "h-[56px] min-h-[56px] max-h-[56px] gap-[8px] px-[16px] py-[18px] text-label-16 [--button-icon-size:24px]",
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
          "disabled:border-0 disabled:bg-disable-container disabled:bg-none disabled:text-on-disable aria-disabled:border-0 aria-disabled:bg-disable-container aria-disabled:bg-none aria-disabled:text-on-disable [filter:none]",
      },
      {
        variant: "tertiary-outline",
        disabled: true,
        className:
          "disabled:border disabled:border-disable disabled:bg-disable-container disabled:text-on-disable aria-disabled:border aria-disabled:border-disable aria-disabled:bg-disable-container aria-disabled:text-on-disable [filter:none]",
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
  const classes = clsx(
    buttonVariants({ variant, size, disabled: isDisabled, loading }),
    className,
  );

  const Comp = asChild ? Slot : "button";
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
