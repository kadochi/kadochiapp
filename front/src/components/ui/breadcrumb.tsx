"use client";

import { useEffect, useRef, type ComponentProps } from "react";
import { cva } from "class-variance-authority";
import { Ellipsis } from "lucide-react";
import { cn } from "../../lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";

const breadcrumbVariants = cva([
  "box-border block overflow-x-auto overflow-y-hidden whitespace-nowrap px-16 py-12",
  "[direction:rtl] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
]);

type Crumb = {
  label: string;
  href?: string;
};

type BreadcrumbProps = Omit<ComponentProps<"nav">, "children"> & {
  items: Crumb[];
  /** Collapse middle items into a menu once item count exceeds this. Unset = never collapse. */
  maxItems?: number;
  /** Items to keep visible at the start before collapsing. Default 1. */
  itemsBeforeCollapse?: number;
  /** Items to keep visible at the end (incl. current page) before collapsing. Default 1. */
  itemsAfterCollapse?: number;
};

function BreadcrumbSeparator() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none select-none text-surface-neutral-low-emphasis"
    >
      /
    </span>
  );
}

function BreadcrumbCrumb({ item, isCurrent }: { item: Crumb; isCurrent: boolean }) {
  if (item.href && !isCurrent) {
    return (
      <a
        href={item.href}
        className="inline-flex items-center gap-0 text-label-12 font-regular text-surface-neutral-mid-emphasis no-underline hover:text-surface-neutral-high-emphasis"
      >
        {item.label}
      </a>
    );
  }

  return (
    <span
      aria-current={isCurrent ? "page" : undefined}
      className={cn(
        "inline-flex items-center gap-0 text-label-12 font-regular text-surface-neutral-mid-emphasis",
        isCurrent && "cursor-default font-bold text-surface-neutral-high-emphasis",
      )}
    >
      {item.label}
    </span>
  );
}

function Breadcrumb({
  items,
  maxItems,
  itemsBeforeCollapse = 1,
  itemsAfterCollapse = 1,
  className,
  "aria-label": ariaLabel,
  ...props
}: BreadcrumbProps) {
  const wrapRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = wrapRef.current;

    if (element) {
      element.scrollLeft = 0;
    }
  }, [items]);

  const lastIndex = items.length - 1;
  const shouldCollapse =
    maxItems !== undefined &&
    items.length > maxItems &&
    items.length - itemsBeforeCollapse - itemsAfterCollapse > 1;

  const visibleBefore = shouldCollapse
    ? items.slice(0, itemsBeforeCollapse)
    : items;
  const hidden = shouldCollapse
    ? items.slice(itemsBeforeCollapse, items.length - itemsAfterCollapse)
    : [];
  const visibleAfter = shouldCollapse
    ? items.slice(items.length - itemsAfterCollapse)
    : [];

  const renderCrumbItem = (item: Crumb, index: number, showSeparator: boolean) => (
    <li key={`${item.label}-${index}`} className="inline-flex items-center gap-8">
      {showSeparator && <BreadcrumbSeparator />}
      <BreadcrumbCrumb item={item} isCurrent={index === lastIndex} />
    </li>
  );

  return (
    <nav
      {...props}
      ref={wrapRef}
      aria-label={ariaLabel ?? "breadcrumb"}
      className={cn(breadcrumbVariants(), className)}
    >
      <ol className="m-0 inline-flex list-none items-center gap-8 p-0">
        {!shouldCollapse &&
          items.map((item, index) => renderCrumbItem(item, index, index > 0))}

        {shouldCollapse && (
          <>
            {visibleBefore.map((item, index) =>
              renderCrumbItem(item, index, index > 0),
            )}

            <li className="inline-flex items-center gap-8">
              <BreadcrumbSeparator />
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label="نمایش موارد بیشتر"
                  className="inline-flex size-20 items-center justify-center rounded-rounded text-surface-neutral-mid-emphasis hover:bg-surface hover:text-surface-neutral-high-emphasis focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <Ellipsis aria-hidden="true" className="size-16" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {hidden.map((item, index) =>
                    item.href ? (
                      <DropdownMenuItem
                        key={`${item.label}-${index}`}
                        asChild
                      >
                        <a href={item.href}>{item.label}</a>
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        key={`${item.label}-${index}`}
                        disabled
                      >
                        {item.label}
                      </DropdownMenuItem>
                    ),
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </li>

            {visibleAfter.map((item, index) => {
              const originalIndex = items.length - itemsAfterCollapse + index;

              return renderCrumbItem(item, originalIndex, true);
            })}
          </>
        )}
      </ol>
    </nav>
  );
}

export { Breadcrumb, breadcrumbVariants };
export type { BreadcrumbProps, Crumb };
