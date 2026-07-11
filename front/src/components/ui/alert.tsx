import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";
import {
  CircleAlert,
  CircleCheck,
  Info,
  TriangleAlert,
  X,
  type LucideIcon,
} from "lucide-react";

const alertVariants = cva(
  "flex items-start gap-12 rounded-m p-16 font-sans",
  {
    variants: {
      tone: {
        info: "bg-information-container text-on-information-container",
        success: "bg-success-container text-on-success-container",
        warning: "bg-warning-container text-on-warning-container",
        error: "bg-error-container text-on-error-container",
      },
    },
    defaultVariants: {
      tone: "info",
    },
  },
);

type AlertTone = NonNullable<VariantProps<typeof alertVariants>["tone"]>;

const toneIcons: Record<AlertTone, LucideIcon> = {
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  error: CircleAlert,
};

type AlertProps = Omit<ComponentPropsWithoutRef<"div">, "title"> &
  VariantProps<typeof alertVariants> & {
    /** Prominent heading for the alert. */
    title?: ReactNode;
    /** Replaces the default tone icon. */
    icon?: ReactNode;
    /** Renders a dismiss control that calls this handler. */
    onDismiss?: () => void;
    /** Accessible name for the dismiss control. */
    dismissLabel?: string;
  };

const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(
  {
    className,
    tone = "info",
    title,
    icon,
    onDismiss,
    dismissLabel = "Dismiss",
    children,
    role,
    ...props
  },
  ref,
) {
  const resolvedTone: AlertTone = tone ?? "info";
  const DefaultIcon = toneIcons[resolvedTone];
  const resolvedRole =
    role ??
    (resolvedTone === "error" || resolvedTone === "warning" ? "alert" : "status");

  return (
    <div
      {...props}
      ref={ref}
      role={resolvedRole}
      className={cn(alertVariants({ tone }), className)}
    >
      <span aria-hidden="true" className="mt-px shrink-0 [&>svg]:size-20">
        {icon ?? <DefaultIcon />}
      </span>
      <div className="min-w-0 flex-1">
        {title ? (
          <p className="text-label-16 font-bold leading-normal">{title}</p>
        ) : null}
        {children ? (
          <div
            className={cn(
              "text-label-14 font-regular leading-normal",
              title && "mt-2",
            )}
          >
            {children}
          </div>
        ) : null}
      </div>
      {onDismiss ? (
        <button
          aria-label={dismissLabel}
          className="-me-2 -mt-2 inline-flex size-24 shrink-0 items-center justify-center rounded-full text-current transition-colors hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
          type="button"
          onClick={onDismiss}
        >
          <X aria-hidden="true" className="size-16" />
        </button>
      ) : null}
    </div>
  );
});

export { Alert, alertVariants };
export type { AlertProps, AlertTone };
