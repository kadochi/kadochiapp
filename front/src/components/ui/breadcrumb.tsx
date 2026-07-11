"use client";

import { useEffect, useRef, type ComponentProps } from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

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
};

function Breadcrumb({
  items,
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

  return (
    <nav
      {...props}
      ref={wrapRef}
      aria-label={ariaLabel ?? "breadcrumb"}
      className={cn(breadcrumbVariants(), className)}
    >
      <ol className="m-0 inline-flex list-none items-center gap-8 p-0">
        {items.map((item, index) => {
          const isCurrent = index === lastIndex;

          return (
            <li key={`${item.label}-${index}`} className="inline-flex items-center gap-8">
              {index > 0 && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none select-none text-surface-neutral-low-emphasis"
                >
                  /
                </span>
              )}
              {item.href && !isCurrent ? (
                <a
                  href={item.href}
                  className="inline-flex items-center gap-0 text-label-12 font-regular text-surface-neutral-mid-emphasis no-underline hover:text-surface-neutral-high-emphasis"
                >
                  {item.label}
                </a>
              ) : (
                <span
                  aria-current={isCurrent ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-0 text-label-12 font-regular text-surface-neutral-mid-emphasis",
                    isCurrent && "cursor-default font-bold text-surface-neutral-high-emphasis",
                  )}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export { Breadcrumb, breadcrumbVariants };
export type { BreadcrumbProps, Crumb };
