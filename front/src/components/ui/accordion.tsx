"use client";

import {
  useId,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { ChevronDown } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const accordionItemVariants = cva(
  "overflow-hidden rounded-m border transition-[border-color,box-shadow] duration-150 ease-out",
  {
    variants: {
      variant: {
        outline:
          "border-border-low-emphasis bg-surface-background data-[state=open]:border-border-high-emphasis",
        subtle:
          "border-transparent bg-surface data-[state=open]:border-border-high-emphasis",
      },
    },
    defaultVariants: {
      variant: "outline",
    },
  },
);

const accordionTriggerVariants = cva(
  [
    "group flex w-full items-center justify-between gap-16 text-start font-regular text-text-primary",
    "cursor-pointer outline-none transition-colors duration-150 ease-out",
    "hover:bg-surface focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-secondary/40",
    "disabled:cursor-not-allowed disabled:bg-disable-container disabled:text-on-disable",
  ],
  {
    variants: {
      size: {
        sm: "px-16 py-12 text-body-14",
        md: "px-20 py-16 text-body-16",
        lg: "px-24 py-20 text-body-16",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

const accordionContentVariants = cva(
  "overflow-hidden text-start font-regular text-text-secondary",
  {
    variants: {
      size: {
        sm: "px-16 pb-12 text-body-12",
        md: "px-20 pb-16 text-body-14",
        lg: "px-24 pb-20 text-body-14",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

type AccordionItem = {
  /** Unique value used to identify and control this item. */
  value: string;
  /** Content displayed in the item's trigger. */
  title: ReactNode;
  /** Content revealed when the item is expanded. */
  content: ReactNode;
  /** Prevents this item from being expanded or collapsed. */
  disabled?: boolean;
};

type AccordionProps = Omit<
  ComponentPropsWithoutRef<"div">,
  "children" | "onChange"
> &
  VariantProps<typeof accordionItemVariants> &
  VariantProps<typeof accordionTriggerVariants> & {
    /** Ordered items displayed by the accordion. Item values must be unique. */
    items: readonly AccordionItem[];
    /** Allows more than one item to be expanded at a time. */
    type?: "single" | "multiple";
    /** Expanded item values in controlled mode. */
    value?: readonly string[];
    /** Initially expanded item values in uncontrolled mode. */
    defaultValue?: readonly string[];
    /** Called with all expanded item values after a user interaction. */
    onValueChange?: (value: string[]) => void;
  };

function normalizeValue(value: readonly string[], type: "single" | "multiple") {
  return type === "single" ? value.slice(0, 1) : [...value];
}

function Accordion({
  items,
  type = "single",
  value,
  defaultValue = [],
  onValueChange,
  variant,
  size,
  className,
  dir = "rtl",
  ...props
}: AccordionProps) {
  const generatedId = useId();
  const [uncontrolledValue, setUncontrolledValue] = useState(() =>
    normalizeValue(defaultValue, type),
  );
  const expandedValues = normalizeValue(value ?? uncontrolledValue, type);

  function toggleItem(itemValue: string) {
    const isExpanded = expandedValues.includes(itemValue);
    let nextValue: string[];

    if (type === "multiple") {
      nextValue = isExpanded
        ? expandedValues.filter((value) => value !== itemValue)
        : [...expandedValues, itemValue];
    } else {
      nextValue = isExpanded ? [] : [itemValue];
    }

    if (value === undefined) setUncontrolledValue(nextValue);
    onValueChange?.(nextValue);
  }

  return (
    <div
      {...props}
      className={cn("w-full space-y-12 font-sans", className)}
      dir={dir}
    >
      {items.map((item, index) => {
        const isExpanded = expandedValues.includes(item.value);
        const triggerId = `${generatedId}-trigger-${index}`;
        const contentId = `${generatedId}-content-${index}`;

        return (
          <div
            key={item.value}
            className={accordionItemVariants({ variant })}
            data-state={isExpanded ? "open" : "closed"}
          >
            <h3>
              <button
                aria-controls={contentId}
                aria-expanded={isExpanded}
                className={accordionTriggerVariants({ size })}
                disabled={item.disabled}
                id={triggerId}
                type="button"
                onClick={() => toggleItem(item.value)}
              >
                <span className="min-w-0 flex-1">{item.title}</span>
                <ChevronDown
                  aria-hidden="true"
                  className={cn(
                    "size-20 shrink-0 transition-transform duration-150 ease-out",
                    isExpanded && "rotate-180",
                  )}
                />
              </button>
            </h3>
            <div
              hidden={!isExpanded}
              aria-labelledby={triggerId}
              className={accordionContentVariants({ size })}
              id={contentId}
              role="region"
            >
              {item.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export {
  Accordion,
  accordionContentVariants,
  accordionItemVariants,
  accordionTriggerVariants,
};
export type { AccordionItem, AccordionProps };
export default Accordion;
