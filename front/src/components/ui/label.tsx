import { Slot } from "@radix-ui/react-slot";
import {
  Children,
  cloneElement,
  isValidElement,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type ReactNode,
} from "react";
import { cva, type VariantProps } from "class-variance-authority";
import clsx from "clsx";

const labelVariants = cva(
  [
    "inline-flex w-fit items-center justify-center whitespace-nowrap rounded-rounded font-sans font-regular no-underline [direction:rtl]",
  ],
  {
    variants: {
      variant: {
        success: null,
        secondary: null,
        warning: null,
        danger: null,
        neutral: null,
      },
      appearance: {
        solid: null,
        soft: null,
        gradient: null,
      },
      size: {
        sm: "h-24 gap-4 px-8 text-label-12 [--label-icon-size:14px]",
        md: "h-32 gap-6 px-12 text-label-14 [--label-icon-size:16px]",
      },
    },
    compoundVariants: [
      {
        variant: "success",
        appearance: "solid",
        className: "bg-success text-on-success",
      },
      {
        variant: "success",
        appearance: "soft",
        className: "bg-success-container text-on-success-container",
      },
      {
        variant: "success",
        appearance: "gradient",
        className:
          "bg-success text-on-success [background-image:linear-gradient(to_left,var(--color-success),var(--color-success-container))]",
      },
      {
        variant: "secondary",
        appearance: "solid",
        className: "bg-secondary text-on-secondary",
      },
      {
        variant: "secondary",
        appearance: "soft",
        className: "bg-secondary-container text-on-secondary-container",
      },
      {
        variant: "secondary",
        appearance: "gradient",
        className:
          "bg-secondary text-on-secondary [background-image:linear-gradient(to_left,var(--color-secondary),var(--color-secondary-gradient))]",
      },
      {
        variant: "warning",
        appearance: "solid",
        className: "bg-warning text-on-warning",
      },
      {
        variant: "warning",
        appearance: "soft",
        className: "bg-warning-container text-on-warning-container",
      },
      {
        variant: "warning",
        appearance: "gradient",
        className:
          "bg-warning text-on-warning [background-image:linear-gradient(to_left,var(--color-warning),var(--color-warning-container))]",
      },
      {
        variant: "danger",
        appearance: "solid",
        className: "bg-error text-on-error",
      },
      {
        variant: "danger",
        appearance: "soft",
        className: "bg-error-container text-on-error-container",
      },
      {
        variant: "danger",
        appearance: "gradient",
        className:
          "bg-error text-on-error [background-image:linear-gradient(to_left,var(--color-error),var(--color-error-container))]",
      },
      {
        variant: "neutral",
        appearance: "solid",
        className: "bg-disable text-on-disable",
      },
      {
        variant: "neutral",
        appearance: "soft",
        className: "bg-disable-container text-on-disable-container",
      },
      {
        variant: "neutral",
        appearance: "gradient",
        className:
          "bg-disable text-on-disable [background-image:linear-gradient(to_left,var(--color-disable),var(--color-disable-container))]",
      },
    ],
    defaultVariants: {
      variant: "success",
      appearance: "solid",
      size: "md",
    },
  },
);

type LabelProps = ComponentPropsWithoutRef<"span"> &
  VariantProps<typeof labelVariants> & {
    /** Render the supplied child element as the label root. */
    asChild?: boolean;
    /** Decorative content displayed before the label text. */
    leadingIcon?: ReactNode;
  };

function Label({
  asChild = false,
  variant,
  appearance,
  size,
  leadingIcon,
  className,
  children,
  ...props
}: LabelProps) {
  const classes = clsx(labelVariants({ variant, appearance, size }), className);
  let child: ReactElement<{ children?: ReactNode }> | undefined;

  if (asChild) {
    const onlyChild = Children.only(children);

    if (!isValidElement<{ children?: ReactNode }>(onlyChild)) {
      throw new Error("Label with asChild expects a single element child.");
    }

    child = onlyChild;
  }

  const content = (
    <>
      {leadingIcon ? (
        <span
          aria-hidden="true"
          className="inline-flex shrink-0 items-center justify-center [&>svg]:size-[var(--label-icon-size)]"
        >
          {leadingIcon}
        </span>
      ) : null}
      <span>{child ? child.props.children : children}</span>
    </>
  );

  if (child) {
    return (
      <Slot {...props} className={classes}>
        {cloneElement(child, undefined, content)}
      </Slot>
    );
  }

  return (
    <span {...props} className={classes}>
      {content}
    </span>
  );
}

export { Label, labelVariants };
export type { LabelProps };
