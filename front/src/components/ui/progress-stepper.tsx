import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Check } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import clsx from "clsx";

const progressStepperVariants = cva("m-0 w-full list-none p-0 font-sans", {
  variants: {
    orientation: {
      horizontal: "grid grid-flow-col auto-cols-fr items-start",
      vertical: "flex flex-col",
    },
    size: {
      sm: "[--progress-icon-size:0.75rem] [--progress-indicator-size:1.25rem] [--progress-label-gap:0.375rem] text-label-10",
      md: "[--progress-icon-size:0.875rem] [--progress-indicator-size:1.5rem] [--progress-label-gap:0.5rem] text-label-12",
      lg: "[--progress-icon-size:1rem] [--progress-indicator-size:2rem] [--progress-label-gap:0.625rem] text-label-14",
    },
  },
  defaultVariants: {
    orientation: "horizontal",
    size: "md",
  },
});

const progressStepVariants = cva("relative min-w-0", {
  variants: {
    orientation: {
      horizontal: "flex flex-col items-center text-center",
      vertical:
        "grid grid-cols-[var(--progress-indicator-size)_minmax(0,1fr)] gap-x-12 pb-16 text-start last:pb-0",
    },
  },
  defaultVariants: {
    orientation: "horizontal",
  },
});

const progressIndicatorVariants = cva(
  [
    "relative z-10 inline-flex size-[var(--progress-indicator-size)] shrink-0 items-center justify-center rounded-rounded bg-surface-background font-bold leading-none",
    "ring-inset",
  ],
  {
    variants: {
      status: {
        complete: "bg-secondary text-on-secondary",
        current: "text-secondary ring-2 ring-secondary",
        upcoming: "text-border-high-emphasis ring-1 ring-border-high-emphasis",
        disabled: "bg-disable-container text-on-disable ring-1 ring-disable",
      },
    },
    defaultVariants: {
      status: "upcoming",
    },
  },
);

const progressConnectorVariants = cva("pointer-events-none absolute bg-border-high-emphasis", {
  variants: {
    orientation: {
      horizontal:
        "top-[calc(var(--progress-indicator-size)/2)] start-[calc(50%+var(--progress-indicator-size)/2)] h-px w-[calc(100%-var(--progress-indicator-size))]",
      vertical:
        "top-[var(--progress-indicator-size)] bottom-0 start-[calc(var(--progress-indicator-size)/2)] w-px",
    },
    active: {
      true: "bg-secondary",
      false: "bg-border-high-emphasis",
    },
  },
  defaultVariants: {
    orientation: "horizontal",
    active: false,
  },
});

type StepStatus = "complete" | "current" | "upcoming" | "disabled";

type ProgressStep = {
  /** Stable key used when rendering a changing list of steps. */
  id?: string;
  /** Primary content displayed below or beside the indicator. */
  label: ReactNode;
  /** Optional supporting content. */
  description?: ReactNode;
  /** Visual and semantic state for this step. */
  status?: StepStatus;
};

type ProgressStepperProps = Omit<ComponentPropsWithoutRef<"ol">, "children"> &
  VariantProps<typeof progressStepperVariants> & {
    /** Ordered steps in the progress flow. */
    steps: readonly ProgressStep[];
    /** Shows an ordinal number in non-complete indicators. */
    showStepNumber?: boolean;
  };

const statusText: Record<StepStatus, string> = {
  complete: "Completed",
  current: "Current step",
  upcoming: "Upcoming",
  disabled: "Disabled",
};

function ProgressStepper({
  steps,
  orientation,
  size,
  showStepNumber = true,
  className,
  dir = "rtl",
  "aria-label": ariaLabel = "Progress",
  ...props
}: ProgressStepperProps) {
  const resolvedOrientation = orientation ?? "horizontal";

  return (
    <ol
      {...props}
      aria-label={ariaLabel}
      className={clsx(progressStepperVariants({ orientation, size }), className)}
      dir={dir}
    >
      {steps.map((step, index) => {
        const status = step.status ?? "upcoming";
        const isLastStep = index === steps.length - 1;
        const nextStatus = steps[index + 1]?.status ?? "upcoming";
        const isConnectorActive =
          nextStatus === "complete" || nextStatus === "current";

        return (
          <li
            key={step.id ?? index}
            aria-current={status === "current" ? "step" : undefined}
            className={progressStepVariants({ orientation: resolvedOrientation })}
          >
            {!isLastStep && (
              <span
                aria-hidden="true"
                className={progressConnectorVariants({
                  active: isConnectorActive,
                  orientation: resolvedOrientation,
                })}
              />
            )}

            <span
              aria-hidden="true"
              className={progressIndicatorVariants({ status })}
            >
              {status === "complete" ? (
                <Check className="size-[var(--progress-icon-size)]" strokeWidth={3} />
              ) : showStepNumber ? (
                index + 1
              ) : null}
            </span>

            <span
              className={clsx(
                "min-w-0 text-surface-neutral-high-emphasis",
                resolvedOrientation === "horizontal"
                  ? "mt-[var(--progress-label-gap)]"
                  : "pt-2",
                status === "current" && "font-bold text-secondary",
                status === "disabled" && "text-on-disable",
              )}
            >
              {step.label}
              {step.description && (
                <span className="mt-2 block text-label-10 font-regular text-surface-neutral-mid-emphasis">
                  {step.description}
                </span>
              )}
            </span>
            <span className="sr-only">{statusText[status]}</span>
          </li>
        );
      })}
    </ol>
  );
}

export {
  ProgressStepper,
  progressConnectorVariants,
  progressIndicatorVariants,
  progressStepperVariants,
  progressStepVariants,
};
export type { ProgressStep, ProgressStepperProps, StepStatus };
export default ProgressStepper;
