import { Slot } from "radix-ui";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "../../lib/utils";

type ContainerSize = "sm" | "md" | "lg" | "xl";
type ContainerPadding = "none" | "sm" | "md" | "lg" | "xl";
type ContainerBreakpoint = "sm" | "md" | "lg" | "xl";

type ContainerResponsiveProps = {
  size?: ContainerSize;
  px?: ContainerPadding;
  py?: ContainerPadding;
};

type ContainerProps = ComponentPropsWithoutRef<"div"> &
  ContainerResponsiveProps & {
    /** Renders the container styles on its only child. */
    asChild?: boolean;
    sm?: ContainerResponsiveProps;
    md?: ContainerResponsiveProps;
    lg?: ContainerResponsiveProps;
    xl?: ContainerResponsiveProps;
  };

const sizeClasses: Record<ContainerSize, string> = {
  sm: "max-w-screen-sm",
  md: "max-w-screen-md",
  lg: "max-w-screen-lg",
  xl: "max-w-screen-xl",
};

const horizontalPaddingClasses: Record<ContainerPadding, string> = {
  none: "px-0",
  sm: "px-8",
  md: "px-16",
  lg: "px-24",
  xl: "px-32",
};

const verticalPaddingClasses: Record<ContainerPadding, string> = {
  none: "py-0",
  sm: "py-8",
  md: "py-16",
  lg: "py-24",
  xl: "py-32",
};

// Keep the complete utilities static so Tailwind includes them in the build.
const responsiveSizeClasses: Record<
  ContainerBreakpoint,
  Record<ContainerSize, string>
> = {
  sm: {
    sm: "sm:max-w-screen-sm",
    md: "sm:max-w-screen-md",
    lg: "sm:max-w-screen-lg",
    xl: "sm:max-w-screen-xl",
  },
  md: {
    sm: "md:max-w-screen-sm",
    md: "md:max-w-screen-md",
    lg: "md:max-w-screen-lg",
    xl: "md:max-w-screen-xl",
  },
  lg: {
    sm: "lg:max-w-screen-sm",
    md: "lg:max-w-screen-md",
    lg: "lg:max-w-screen-lg",
    xl: "lg:max-w-screen-xl",
  },
  xl: {
    sm: "xl:max-w-screen-sm",
    md: "xl:max-w-screen-md",
    lg: "xl:max-w-screen-lg",
    xl: "xl:max-w-screen-xl",
  },
};

const responsiveHorizontalPaddingClasses: Record<
  ContainerBreakpoint,
  Record<ContainerPadding, string>
> = {
  sm: {
    none: "sm:px-0",
    sm: "sm:px-8",
    md: "sm:px-16",
    lg: "sm:px-24",
    xl: "sm:px-32",
  },
  md: {
    none: "md:px-0",
    sm: "md:px-8",
    md: "md:px-16",
    lg: "md:px-24",
    xl: "md:px-32",
  },
  lg: {
    none: "lg:px-0",
    sm: "lg:px-8",
    md: "lg:px-16",
    lg: "lg:px-24",
    xl: "lg:px-32",
  },
  xl: {
    none: "xl:px-0",
    sm: "xl:px-8",
    md: "xl:px-16",
    lg: "xl:px-24",
    xl: "xl:px-32",
  },
};

const responsiveVerticalPaddingClasses: Record<
  ContainerBreakpoint,
  Record<ContainerPadding, string>
> = {
  sm: {
    none: "sm:py-0",
    sm: "sm:py-8",
    md: "sm:py-16",
    lg: "sm:py-24",
    xl: "sm:py-32",
  },
  md: {
    none: "md:py-0",
    sm: "md:py-8",
    md: "md:py-16",
    lg: "md:py-24",
    xl: "md:py-32",
  },
  lg: {
    none: "lg:py-0",
    sm: "lg:py-8",
    md: "lg:py-16",
    lg: "lg:py-24",
    xl: "lg:py-32",
  },
  xl: {
    none: "xl:py-0",
    sm: "xl:py-8",
    md: "xl:py-16",
    lg: "xl:py-24",
    xl: "xl:py-32",
  },
};

function responsiveClasses(
  breakpoint: ContainerBreakpoint,
  { size, px, py }: ContainerResponsiveProps,
) {
  return [
    size && responsiveSizeClasses[breakpoint][size],
    px && responsiveHorizontalPaddingClasses[breakpoint][px],
    py && responsiveVerticalPaddingClasses[breakpoint][py],
  ];
}

function Container({
  asChild = false,
  size,
  px = "md",
  py,
  sm,
  md,
  lg,
  xl,
  className,
  ...props
}: ContainerProps) {
  const Comp = asChild ? Slot.Root : "div";

  return (
    <Comp
      {...props}
      className={cn(
        "box-border mx-auto w-full",
        size && sizeClasses[size],
        px && horizontalPaddingClasses[px],
        py && verticalPaddingClasses[py],
        sm && responsiveClasses("sm", sm),
        md && responsiveClasses("md", md),
        lg && responsiveClasses("lg", lg),
        xl && responsiveClasses("xl", xl),
        className,
      )}
    />
  );
}

export { Container };
export type {
  ContainerBreakpoint,
  ContainerPadding,
  ContainerProps,
  ContainerResponsiveProps,
  ContainerSize,
};
