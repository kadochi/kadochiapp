"use client";

import {
  forwardRef,
  useState,
  type ComponentPropsWithoutRef,
} from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";
import { Minus, Plus, Trash2 } from "lucide-react";

const inputStepperVariants = cva(
  [
    "inline-flex shrink-0 select-none items-center justify-between rounded-rounded font-sans font-bold tabular-nums text-surface-neutral-high-emphasis",
  ],
  {
    variants: {
      variant: {
        outline: "border-2 border-primary bg-surface-background",
        subtle: "border border-transparent bg-surface",
      },
      size: {
        sm: "h-32 min-w-96 px-4 text-title-14 [--stepper-control-size:24px]",
        md: "h-56 min-w-[9rem] px-16 text-title-18 [--stepper-control-size:24px]",
      },
    },
    defaultVariants: {
      variant: "outline",
      size: "md",
    },
  },
);

const inputStepperControlVariants = cva(
  [
    "inline-flex size-[var(--stepper-control-size)] items-center justify-center rounded-rounded",
    "transition-colors duration-150 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
  ],
  {
    variants: {
      variant: {
        outline: "bg-transparent hover:bg-surface active:bg-surface-dim",
        subtle:
          "bg-surface-dim hover:bg-border-high-emphasis active:bg-border-high-emphasis",
      },
    },
    defaultVariants: {
      variant: "outline",
    },
  },
);

type InputStepperProps = Omit<
  ComponentPropsWithoutRef<"div">,
  "defaultValue" | "onChange"
> &
  VariantProps<typeof inputStepperVariants> & {
    /** Current quantity in controlled mode. */
    value?: number;
    /** Initial quantity in uncontrolled mode. */
    defaultValue?: number;
    /** Lowest allowed quantity. */
    min?: number;
    /** Highest allowed quantity. */
    max?: number;
    /** Amount added or removed with each action. */
    step?: number;
    /** Prevents quantity changes and removal. */
    disabled?: boolean;
    /** Called with the next quantity after an increment or decrement. */
    onValueChange?: (value: number) => void;
    /** Enables a remove action when the quantity is at its minimum. */
    onRemove?: () => void;
    /** Accessible name for the decrement control. */
    decrementLabel?: string;
    /** Accessible name for the increment control. */
    incrementLabel?: string;
  };

function clamp(value: number, min: number, max?: number) {
  return Math.max(min, max === undefined ? value : Math.min(max, value));
}

const InputStepper = forwardRef<HTMLDivElement, InputStepperProps>(
  function InputStepper(
    {
      className,
      variant,
      size,
      value,
      defaultValue,
      min = 0,
      max,
      step = 1,
      onValueChange,
      onRemove,
      decrementLabel = "Decrease quantity",
      incrementLabel = "Increase quantity",
      disabled = false,
      "aria-label": ariaLabel = "Quantity",
      ...props
    },
    ref,
  ) {
    const minimum = Number.isFinite(min) ? min : 0;
    const maximum =
      max === undefined || !Number.isFinite(max) ? undefined : Math.max(max, minimum);
    const increment = Number.isFinite(step) && step > 0 ? step : 1;
    const [uncontrolledValue, setUncontrolledValue] = useState(() =>
      clamp(defaultValue ?? minimum, minimum, maximum),
    );
    const currentValue = clamp(value ?? uncontrolledValue, minimum, maximum);
    const isAtMinimum = currentValue <= minimum;
    const isAtMaximum = maximum !== undefined && currentValue >= maximum;
    const canRemove = isAtMinimum && onRemove !== undefined;

    function setNextValue(nextValue: number) {
      const next = clamp(nextValue, minimum, maximum);

      if (value === undefined) setUncontrolledValue(next);
      onValueChange?.(next);
    }

    function handleDecrement() {
      if (disabled) return;

      if (canRemove) {
        onRemove?.();
        return;
      }

      if (!isAtMinimum) setNextValue(currentValue - increment);
    }

    function handleIncrement() {
      if (!disabled && !isAtMaximum) setNextValue(currentValue + increment);
    }

    return (
      <div
        {...props}
        ref={ref}
        aria-label={ariaLabel}
        aria-disabled={disabled || undefined}
        className={cn(inputStepperVariants({ variant, size }), className)}
        data-state={
          disabled
            ? "disabled"
            : isAtMaximum
              ? "maximum"
              : isAtMinimum
                ? "minimum"
                : "active"
        }
        role="group"
      >
        <button
          aria-label={incrementLabel}
          className={inputStepperControlVariants({ variant })}
          disabled={disabled || isAtMaximum}
          type="button"
          onClick={handleIncrement}
        >
          <Plus aria-hidden="true" className="size-16" />
        </button>

        <output aria-atomic="true" aria-live="polite" className="flex-1 text-center">
          {currentValue}
        </output>

        <button
          aria-label={canRemove ? "Remove item" : decrementLabel}
          className={cn(
            inputStepperControlVariants({ variant }),
            canRemove && "text-error",
          )}
          disabled={disabled || (isAtMinimum && !canRemove)}
          type="button"
          onClick={handleDecrement}
        >
          {canRemove ? (
            <Trash2 aria-hidden="true" className="size-16" />
          ) : (
            <Minus aria-hidden="true" className="size-16" />
          )}
        </button>
      </div>
    );
  },
);

export { InputStepper, inputStepperControlVariants, inputStepperVariants };
export type { InputStepperProps };
export default InputStepper;
