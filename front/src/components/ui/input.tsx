import {
  forwardRef,
  useId,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";
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
        sm: "h-40 gap-8 px-12 [--input-icon-size:16px]",
        md: "h-56 gap-12 px-16 [--input-icon-size:16px]",
        lg: "h-64 gap-12 px-16 [--input-icon-size:20px]",
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
  "inline-flex items-center gap-4 font-regular",
  {
    variants: {
      status: {
        default: "text-surface-neutral-mid-emphasis",
        error: "text-error",
        success: "text-success",
      },
      size: {
        sm: "text-label-12 [--message-icon-size:14px]",
        md: "text-label-12 [--message-icon-size:14px]",
        lg: "text-label-14 [--message-icon-size:16px]",
      },
    },
    defaultVariants: {
      status: "default",
      size: "md",
    },
  },
);

type FieldStatus = NonNullable<
  VariantProps<typeof inputMessageVariants>["status"]
>;
type FieldSize = NonNullable<VariantProps<typeof inputMessageVariants>["size"]>;

function StatusIcon({ status }: { status: FieldStatus }) {
  const Icon =
    status === "error"
      ? CircleAlert
      : status === "success"
        ? CircleCheck
        : Info;

  return (
    <Icon
      aria-hidden="true"
      className="size-[var(--message-icon-size)] shrink-0"
    />
  );
}

/** Field label shared by Input and Select. */
function FieldLabel({
  htmlFor,
  required,
  children,
}: {
  htmlFor?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label
      className="inline-flex w-fit items-baseline gap-4 text-label-12 font-regular text-surface-neutral-mid-emphasis"
      htmlFor={htmlFor}
    >
      {children}
      {required ? <span className="text-error">*</span> : null}
    </label>
  );
}

/** Supporting/validation message shared by Input and Select. */
function InputMessage({
  id,
  status,
  size,
  children,
}: {
  id?: string;
  status: FieldStatus;
  size: FieldSize;
  children: ReactNode;
}) {
  return (
    <p
      className={inputMessageVariants({ status, size })}
      id={id}
      role={status === "error" ? "alert" : undefined}
    >
      <StatusIcon status={status} />
      {children}
    </p>
  );
}

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
    /** Classes applied to the full-width field container. */
    className?: string;
    /** @deprecated Use `className` instead. */
    containerClassName?: string;
  };

function FieldIcon({
  disabled,
  children,
}: {
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-[var(--input-icon-size)] shrink-0 items-center justify-center text-surface-neutral-mid-emphasis [&>svg]:size-full",
        disabled && "text-on-disable",
      )}
    >
      {children}
    </span>
  );
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    id,
    label,
    description,
    leadingIcon,
    trailingIcon,
    containerClassName,
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
  const resolvedSize = size ?? "md";
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
    <div className={cn("grid w-full gap-8", containerClassName, className)}>
      {label ? (
        <FieldLabel htmlFor={inputId} required={required}>
          {label}
        </FieldLabel>
      ) : null}

      <div className={inputFieldVariants({ size, status })} dir={dir}>
        {leadingIcon ? (
          <FieldIcon disabled={disabled}>{leadingIcon}</FieldIcon>
        ) : null}
        <input
          {...props}
          ref={ref}
          id={inputId}
          aria-describedby={describedBy || undefined}
          aria-invalid={status === "error" || ariaInvalid || undefined}
          className="h-full w-full min-w-0 flex-1 border-0 bg-transparent p-0 font-sans text-label-16 font-regular text-surface-neutral-high-emphasis outline-none placeholder:text-surface-neutral-mid-emphasis disabled:cursor-not-allowed disabled:text-on-disable"
          disabled={disabled}
          required={required}
          dir={dir}
        />
        {trailingIcon ? (
          <FieldIcon disabled={disabled}>{trailingIcon}</FieldIcon>
        ) : null}
      </div>

      {hasDescription ? (
        <InputMessage id={descriptionId} status={status} size={resolvedSize}>
          {description}
        </InputMessage>
      ) : null}
    </div>
  );
});

export {
  Input,
  FieldLabel,
  InputMessage,
  inputFieldVariants,
  inputMessageVariants,
};
export type { InputProps, FieldSize, FieldStatus };
export default Input;
