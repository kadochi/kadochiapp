"use client";

import {
  forwardRef,
  useId,
  type ComponentPropsWithoutRef,
  type ComponentRef,
  type ReactNode,
} from "react";
import { Select as SelectPrimitive } from "radix-ui";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";
import {
  FieldLabel,
  InputMessage,
  inputFieldVariants,
  type FieldSize,
  type FieldStatus,
} from "./input";

const SelectRoot = SelectPrimitive.Root;
const SelectValue = SelectPrimitive.Value;
const SelectGroup = SelectPrimitive.Group;

const SelectTrigger = forwardRef<
  ComponentRef<typeof SelectPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> &
    VariantSize & { status?: FieldStatus }
>(function SelectTrigger({ className, size, status, children, ...props }, ref) {
  return (
    <SelectPrimitive.Trigger
      {...props}
      ref={ref}
      className={cn(
        inputFieldVariants({ size, status }),
        "text-label-16 font-regular text-surface-neutral-high-emphasis outline-none",
        "data-[placeholder]:text-surface-neutral-mid-emphasis",
        "disabled:cursor-not-allowed disabled:border-disable disabled:bg-disable-container disabled:text-on-disable",
        className,
      )}
    >
      {children}
      <SelectPrimitive.Icon className="shrink-0 text-surface-neutral-mid-emphasis">
        <ChevronDown className="size-[var(--input-icon-size)]" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
});

type VariantSize = { size?: FieldSize };

const SelectContent = forwardRef<
  ComponentRef<typeof SelectPrimitive.Content>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(function SelectContent(
  { className, children, position = "popper", sideOffset = 4, ...props },
  ref,
) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        {...props}
        ref={ref}
        position={position}
        sideOffset={sideOffset}
        className={cn(
          "z-50 overflow-hidden rounded-m border border-border-high-emphasis bg-surface-background shadow-[0_8px_24px_rgb(0_0_0_/_0.08)]",
          position === "popper" &&
            "max-h-[var(--radix-select-content-available-height)] min-w-[var(--radix-select-trigger-width)]",
          className,
        )}
      >
        <SelectPrimitive.Viewport className="p-4">
          {children}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
});

const SelectItem = forwardRef<
  ComponentRef<typeof SelectPrimitive.Item>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(function SelectItem({ className, children, ...props }, ref) {
  return (
    <SelectPrimitive.Item
      {...props}
      ref={ref}
      className={cn(
        "relative flex cursor-pointer select-none items-center gap-8 rounded-s px-8 py-8 text-label-16 text-surface-neutral-high-emphasis outline-none",
        "data-[highlighted]:bg-surface data-[state=checked]:text-primary",
        "data-[disabled]:cursor-not-allowed data-[disabled]:text-on-disable",
        className,
      )}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="ms-auto inline-flex shrink-0">
        <Check className="size-16" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
});

type SelectOption = {
  /** Unique value submitted when selected. */
  value: string;
  /** Visible content for this option. */
  label: ReactNode;
  /** Prevents this option from being selected. */
  disabled?: boolean;
};

type SelectProps = Pick<
  ComponentPropsWithoutRef<typeof SelectPrimitive.Root>,
  | "value"
  | "defaultValue"
  | "onValueChange"
  | "name"
  | "required"
  | "disabled"
  | "dir"
  | "open"
  | "defaultOpen"
  | "onOpenChange"
> & {
  /** Visible label. Provide an `aria-label` when omitted. */
  label?: ReactNode;
  /** Supporting or validation text shown below the field. */
  description?: ReactNode;
  /** Validation state, styled like Input. */
  status?: FieldStatus;
  /** Control height, matching Input sizes. */
  size?: FieldSize;
  /** Decorative content placed at the inline start of the trigger. */
  leadingIcon?: ReactNode;
  /** Text shown when no value is selected. */
  placeholder?: string;
  /** Options rendered inside the listbox. */
  items: readonly SelectOption[];
  /** Trigger id, associated with the label. */
  id?: string;
  /** Accessible name when no visible label is provided. */
  "aria-label"?: string;
};

function Select({
  label,
  description,
  status: statusProp,
  size,
  leadingIcon,
  placeholder,
  items,
  id,
  required,
  disabled,
  dir = "rtl",
  "aria-label": ariaLabel,
  ...rootProps
}: SelectProps) {
  const status = statusProp ?? "default";
  const resolvedSize = size ?? "md";
  const generatedId = useId();
  const triggerId = id ?? generatedId;
  const descriptionId = `${triggerId}-description`;
  const hasDescription = Boolean(description);

  return (
    <div className="grid w-full gap-8">
      {label ? (
        <FieldLabel htmlFor={triggerId} required={required}>
          {label}
        </FieldLabel>
      ) : null}

      <SelectRoot
        {...rootProps}
        dir={dir}
        required={required}
        disabled={disabled}
      >
        <SelectTrigger
          id={triggerId}
          size={size}
          status={status}
          aria-label={ariaLabel}
          aria-describedby={hasDescription ? descriptionId : undefined}
          aria-invalid={status === "error" || undefined}
        >
          {leadingIcon ? (
            <span
              aria-hidden="true"
              className={cn(
                "inline-flex size-[var(--input-icon-size)] shrink-0 items-center justify-center text-surface-neutral-mid-emphasis [&>svg]:size-full",
                disabled && "text-on-disable",
              )}
            >
              {leadingIcon}
            </span>
          ) : null}
          <SelectValue
            placeholder={placeholder}
            className="min-w-0 flex-1 truncate text-start"
          />
        </SelectTrigger>

        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value} disabled={item.disabled}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </SelectRoot>

      {hasDescription ? (
        <InputMessage id={descriptionId} status={status} size={resolvedSize}>
          {description}
        </InputMessage>
      ) : null}
    </div>
  );
}

export {
  Select,
  SelectRoot,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  SelectGroup,
};
export type { SelectProps, SelectOption };
export default Select;
