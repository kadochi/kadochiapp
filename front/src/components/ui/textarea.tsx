"use client";

import {
  forwardRef,
  useId,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const textAreaFieldVariants = cva(
  [
    "relative flex w-full rounded-m border bg-surface-background text-surface-neutral-high-emphasis",
    "transition-[border-color,box-shadow,background-color] duration-150 ease-out",
    "focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25",
    "has-[:disabled]:cursor-not-allowed has-[:disabled]:border-disable has-[:disabled]:bg-disable-container",
  ],
  {
    variants: {
      size: {
        sm: "min-h-96 p-12 [--textarea-inset:12px]",
        md: "min-h-120 p-16 [--textarea-inset:16px]",
        lg: "min-h-160 p-16 [--textarea-inset:16px]",
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

const textAreaMessageVariants = cva(
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

type TextAreaProps = Omit<ComponentPropsWithoutRef<"textarea">, "size"> &
  VariantProps<typeof textAreaFieldVariants> & {
    /** Visible label. Provide an `aria-label` when this is omitted. */
    label?: ReactNode;
    /** Supporting or validation text shown below the field. */
    description?: ReactNode;
    /** Decorative content placed at the inline start of the field. */
    leadingIcon?: ReactNode;
    /** Shows the current character count; pairs naturally with `maxLength`. */
    showCount?: boolean;
  };

function textLength(value: string | number | readonly string[] | undefined) {
  return Array.isArray(value)
    ? value.join("").length
    : String(value ?? "").length;
}

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  function TextArea(
    {
      id,
      label,
      description,
      leadingIcon,
      showCount = false,
      size,
      status,
      className,
      disabled,
      required,
      rows = 4,
      value,
      defaultValue,
      maxLength,
      dir = "rtl",
      onChange,
      "aria-describedby": ariaDescribedBy,
      "aria-invalid": ariaInvalid,
      ...props
    },
    ref,
  ) {
    const generatedId = useId();
    const textAreaId = id ?? generatedId;
    const descriptionId = `${textAreaId}-description`;
    const [uncontrolledLength, setUncontrolledLength] = useState(() =>
      textLength(defaultValue),
    );
    const count = value !== undefined ? textLength(value) : uncontrolledLength;
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
            htmlFor={textAreaId}
          >
            {label}
            {required ? <span className="text-error">*</span> : null}
          </label>
        ) : null}

        <div className={textAreaFieldVariants({ size, status })} dir={dir}>
          {leadingIcon ? (
            <span
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute start-[var(--textarea-inset)] top-[var(--textarea-inset)] inline-flex size-16 shrink-0 items-center justify-center text-surface-neutral-mid-emphasis [&>svg]:size-16",
                disabled && "text-on-disable",
              )}
            >
              {leadingIcon}
            </span>
          ) : null}
          <textarea
            {...props}
            ref={ref}
            id={textAreaId}
            aria-describedby={describedBy || undefined}
            aria-invalid={status === "error" || ariaInvalid || undefined}
            className={cn(
              "min-h-0 w-full resize-y border-0 bg-transparent p-0 font-sans text-label-16 font-regular text-surface-neutral-high-emphasis outline-none placeholder:text-surface-neutral-mid-emphasis disabled:cursor-not-allowed disabled:text-on-disable",
              leadingIcon && "ps-24",
              className,
            )}
            disabled={disabled}
            required={required}
            rows={rows}
            value={value}
            defaultValue={defaultValue}
            maxLength={maxLength}
            dir={dir}
            onChange={(event) => {
              if (value === undefined)
                setUncontrolledLength(event.target.value.length);
              onChange?.(event);
            }}
          />
        </div>

        {hasDescription || showCount ? (
          <div className="flex min-h-14 items-start justify-between gap-16">
            {hasDescription ? (
              <p
                className={textAreaMessageVariants({ status })}
                id={descriptionId}
                role={status === "error" ? "alert" : undefined}
              >
                {description}
              </p>
            ) : (
              <span />
            )}
            {showCount ? (
              <output className="shrink-0 text-label-12 font-regular text-surface-neutral-mid-emphasis">
                {maxLength === undefined ? count : `${count} / ${maxLength}`}
              </output>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  },
);

export { TextArea, textAreaFieldVariants, textAreaMessageVariants };
export type { TextAreaProps };
export default TextArea;
