import {
  forwardRef,
  useId,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { cva, type VariantProps } from "class-variance-authority";
import clsx from "clsx";
import { CircleAlert, CircleCheck, Info } from "lucide-react";

const inputFieldVariants = cva(
  [
    "relative flex w-full items-center rounded-m border bg-surface-background text-surface-neutral-high-emphasis",
    "transition-[border-color,box-shadow,background-color] duration-150 ease-out",
    "focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25",
    "has-[:disabled]:cursor-not-allowed has-[:disabled]:border-disable has-[:disabled]:bg-disable-container",
  ],
  {
    variants: {
      size: {
        sm: "h-40 px-12 [--input-icon-size:16px] [--input-inset:12px]",
        md: "h-56 px-16 [--input-icon-size:16px] [--input-inset:16px]",
        lg: "h-64 px-16 [--input-icon-size:20px] [--input-inset:16px]",
      },
      status: {
        default: "border-border-high-emphasis",
        error:
          "border-error focus-within:border-error focus-within:ring-error/20",
        success:
          "border-success focus-within:border-success focus-within:ring-success/20",
      },
    },
    defaultVariants: {
      size: "md",
      status: "default",
    },
  },
);

const inputMessageVariants = cva(
  "inline-flex items-start gap-4 text-label-12 font-regular",
  {
    variants: {
      status: {
        default: "text-surface-neutral-mid-emphasis",
        error: "text-error",
        success: "text-success",
      },
    },
    defaultVariants: {
      status: "default",
    },
  },
);

type InputProps = Omit<ComponentPropsWithoutRef<"input">, "size"> &
  VariantProps<typeof inputFieldVariants> & {
    /** Visible label. Provide an `aria-label` when this is omitted. */
    label?: ReactNode;
    /** Supporting or validation text shown below the field. */
    description?: ReactNode;
    /** Decorative content placed at the inline start of the field. */
    leadingIcon?: ReactNode;
    /** Decorative content placed at the inline end of the field. */
    trailingIcon?: ReactNode;
  };

function StatusIcon({ status }: { status: NonNullable<InputProps["status"]> }) {
  const Icon =
    status === "error"
      ? CircleAlert
      : status === "success"
        ? CircleCheck
        : Info;

  return <Icon aria-hidden="true" className="mt-px size-14 shrink-0" />;
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    id,
    label,
    description,
    leadingIcon,
    trailingIcon,
    size,
    status: statusProp,
    className,
    disabled,
    required,
    dir = "rtl",
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
    ...props
  },
  ref,
) {
  const status = statusProp ?? "default";
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = `${inputId}-description`;
  const hasDescription = Boolean(description);
  const describedBy = [
    ariaDescribedBy,
    hasDescription ? descriptionId : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="grid w-full gap-8">
      {label ? (
        <label
          className="inline-flex w-fit items-baseline gap-4 text-label-12 font-regular text-surface-neutral-mid-emphasis"
          htmlFor={inputId}
        >
          {label}
          {required ? <span className="text-error">*</span> : null}
        </label>
      ) : null}

      <div className={inputFieldVariants({ size, status })} dir={dir}>
        {leadingIcon ? (
          <span
            aria-hidden="true"
            className={clsx(
              "pointer-events-none absolute start-[var(--input-inset)] inline-flex size-[var(--input-icon-size)] items-center justify-center text-surface-neutral-mid-emphasis [&>svg]:size-full",
              disabled && "text-on-disable",
            )}
          >
            {leadingIcon}
          </span>
        ) : null}
        <input
          {...props}
          ref={ref}
          id={inputId}
          aria-describedby={describedBy || undefined}
          aria-invalid={status === "error" || ariaInvalid || undefined}
          className={clsx(
            "h-full min-w-0 flex-1 border-0 bg-transparent p-0 font-sans text-label-16 font-regular text-surface-neutral-high-emphasis outline-none placeholder:text-surface-neutral-mid-emphasis disabled:cursor-not-allowed disabled:text-on-disable",
            leadingIcon && "ps-24",
            trailingIcon && "pe-24",
            className,
          )}
          disabled={disabled}
          required={required}
          dir={dir}
        />
        {trailingIcon ? (
          <span
            aria-hidden="true"
            className={clsx(
              "pointer-events-none absolute end-[var(--input-inset)] inline-flex size-[var(--input-icon-size)] items-center justify-center text-surface-neutral-mid-emphasis [&>svg]:size-full",
              disabled && "text-on-disable",
            )}
          >
            {trailingIcon}
          </span>
        ) : null}
      </div>

      {hasDescription ? (
        <p
          className={inputMessageVariants({ status })}
          id={descriptionId}
          role={status === "error" ? "alert" : undefined}
        >
          <StatusIcon status={status} />
          {description}
        </p>
      ) : null}
    </div>
  );
});

export { Input, inputFieldVariants, inputMessageVariants };
export type { InputProps };
export default Input;
