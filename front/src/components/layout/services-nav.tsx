"use client";

import Link from "next/link";
import { cva } from "class-variance-authority";
import { Label } from "@/components/ui/label";
import { OPEN_PWA_INSTALL_PROMPT_EVENT } from "@/lib/pwa-install";
import { cn } from "@/lib/utils";

export type ServiceItem = {
  label: string;
  href?: string;
  icon: string;
  action?: "install-pwa";
  variant?: "wide" | "sq";
  comingSoon?: boolean;
  isNew?: boolean;
  mobileOnly?: boolean;
};

export type ServicesNavProps = {
  items: ServiceItem[];
  className?: string;
};

const serviceItemVariants = cva(
  "relative flex w-72 cursor-pointer flex-col items-center border-0 bg-transparent p-0 font-sans text-inherit no-underline min-[576px]:col-auto min-[576px]:justify-self-center",
  {
    variants: {
      variant: {
        sq: null,
        wide: "col-span-2 w-auto justify-self-stretch min-[576px]:w-72",
      },
    },
  },
);

/** A responsive, right-to-left navigation grid for service categories. */
function ServicesNav({ items, className }: Readonly<ServicesNavProps>) {
  return (
    <section
      className={cn("overflow-x-clip py-24 min-[576px]:px-16", className)}
      dir="rtl"
    >
      <div className="mx-auto grid w-full max-w-[324px] grid-cols-[repeat(4,72px)] justify-items-center gap-12 min-[576px]:max-w-none min-[576px]:grid-cols-[repeat(auto-fit,72px)] min-[576px]:justify-center min-[576px]:gap-24">
        {items.map((item, index) => {
          const contents = (
            <>
            {item.comingSoon ? (
              <Label
                appearance="soft"
                className="absolute -top-6 -left-6 z-2"
                size="sm"
                variant="danger"
              >
                به‌زودی
              </Label>
            ) : null}
            {item.isNew ? (
              <Label
                appearance="solid"
                className="absolute -top-6 -left-6 z-2"
                size="sm"
                variant="secondary"
              >
                جدید
              </Label>
            ) : null}

            <span
              aria-hidden="true"
              className="grid size-72 place-items-center rounded-[var(--radius-l)] border-[1.5px] border-secondary-container bg-surface-background data-[wide=true]:w-full min-[576px]:data-[wide=true]:w-72"
              data-wide={item.variant === "wide" || undefined}
            >
              {/* Keep the legacy image behavior: service icon URLs may be arbitrary. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="" className="size-40" src={item.icon} />
            </span>
            <span className="mt-8 line-clamp-2 max-w-full overflow-hidden break-words text-center font-sans text-label-12 font-bold leading-[var(--text-label-12--line-height)] text-surface-neutral-high-emphasis [word-break:break-word]">
              {item.label}
            </span>
            </>
          );
          const className = cn(
            serviceItemVariants({ variant: item.variant }),
            item.mobileOnly && "min-[576px]:hidden",
          );

          if (item.action === "install-pwa") {
            return (
              <button
                aria-label={item.label}
                className={className}
                key={`action-${item.action}-${index}`}
                onClick={() => window.dispatchEvent(new Event(OPEN_PWA_INSTALL_PROMPT_EVENT))}
                type="button"
              >
                {contents}
              </button>
            );
          }

          return (
            <Link
              className={className}
              href={item.href ?? "/"}
              key={`${item.href}-${index}`}
              prefetch={false}
            >
              {contents}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export { ServicesNav, serviceItemVariants };
export default ServicesNav;
