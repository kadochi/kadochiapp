"use client";

import {
  createContext,
  forwardRef,
  useContext,
  type ComponentPropsWithoutRef,
  type ComponentRef,
  type ReactNode,
} from "react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const radioVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center rounded-full border-[1.5px] bg-surface-background text-transparent",
    "transition-[background-color,border-color,color,box-shadow] duration-150 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/30 focus-visible:ring-offset-2",
    "disabled:border-disable disabled:bg-disable-container disabled:text-on-disable",
    // Disabled overrides the checked tone (compound wins on specificity).
    "disabled:data-[state=checked]:border-disable disabled:data-[state=checked]:bg-disable-container disabled:data-[state=checked]:text-on-disable",
  ],
  {
    variants: {
      tone: {
        primary: [
          "border-border-high-emphasis",
          "group-hover:enabled:border-primary",
          "data-[state=checked]:border-primary data-[state=checked]:bg-primary-container data-[state=checked]:text-primary",
          "group-hover:enabled:data-[state=checked]:shadow-[0_0_0_2px_color-mix(in_oklab,var(--color-primary)_40%,transparent)]",
        ],
        secondary: [
          "border-border-high-emphasis",
          "group-hover:enabled:border-secondary",
          "data-[state=checked]:border-secondary data-[state=checked]:bg-secondary-container data-[state=checked]:text-secondary",
          "group-hover:enabled:data-[state=checked]:shadow-[0_0_0_2px_color-mix(in_oklab,var(--color-secondary)_40%,transparent)]",
        ],
      },
      size: {
        small: "size-20 [--radio-dot-size:12px]",
        medium: "size-24 [--radio-dot-size:16px]",
      },
      invalid: {
        true: [
          "border-error",
          "group-hover:enabled:border-error",
          "data-[state=checked]:border-error data-[state=checked]:bg-error-container data-[state=checked]:text-error",
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

type RadioContextValue = Pick<
  VariantProps<typeof radioVariants>,
  "tone" | "size" | "invalid"
>;

const RadioContext = createContext<RadioContextValue>({});

type RadioGroupProps = Omit<
  ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>,
  "asChild"
> &
  RadioContextValue;

const RadioGroup = forwardRef<
  ComponentRef<typeof RadioGroupPrimitive.Root>,
  RadioGroupProps
>(function RadioGroup(
  { className, tone, size, invalid, children, dir = "rtl", ...props },
  ref,
) {
  return (
    <RadioContext.Provider value={{ tone, size, invalid }}>
      <RadioGroupPrimitive.Root
        {...props}
        ref={ref}
        dir={dir}
        aria-invalid={invalid || undefined}
        className={cn("flex flex-col gap-16", className)}
      >
        {children}
      </RadioGroupPrimitive.Root>
    </RadioContext.Provider>
  );
});

type RadioGroupItemProps = Omit<
  ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>,
  "asChild"
> & {
  /** Content that labels the radio. Provide `aria-label` when omitted. */
  label?: ReactNode;
};

const RadioGroupItem = forwardRef<
  ComponentRef<typeof RadioGroupPrimitive.Item>,
  RadioGroupItemProps
>(function RadioGroupItem({ className, label, disabled, ...props }, ref) {
  const { tone, size, invalid } = useContext(RadioContext);

  return (
    <label
      className={cn(
        "group inline-flex w-fit cursor-pointer select-none items-center gap-12 font-sans text-label-12 font-regular text-surface-neutral-high-emphasis",
        "has-[:disabled]:cursor-not-allowed has-[:disabled]:text-on-disable",
        className,
      )}
    >
      <RadioGroupPrimitive.Item
        {...props}
        ref={ref}
        disabled={disabled}
        className={radioVariants({ tone, size, invalid })}
      >
        <RadioGroupPrimitive.Indicator
          forceMount
          className="inline-flex items-center justify-center data-[state=unchecked]:text-transparent"
        >
          <span className="size-[var(--radio-dot-size)] rounded-full bg-current" />
        </RadioGroupPrimitive.Indicator>
      </RadioGroupPrimitive.Item>
      {label ? <span>{label}</span> : null}
    </label>
  );
});

export { RadioGroup, RadioGroupItem, radioVariants };
export type { RadioGroupProps, RadioGroupItemProps };
