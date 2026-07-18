import Link from "next/link";
import { ChevronLeft } from "lucide-react";

/* eslint-disable @next/next/no-img-element -- This fixed local icon is shared by the existing icon system. */

import SectionHeader from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ProductsSlider } from "@/features/products/components/products-slider";
import type { Product } from "@/features/products/types";

type LandingProductRailProps = {
  title: string;
  subtitle: string;
  href: string;
  items: readonly Product[];
  badge?: "fast-delivery";
};

/** A homepage product rail composed from the catalog card and slider primitives. */
export function LandingProductRail({
  title,
  subtitle,
  href,
  items,
  badge,
}: Readonly<LandingProductRailProps>) {
  if (!items.length) return null;

  return (
    <section aria-labelledby={`${title}-heading`}>
      <SectionHeader
        as="h2"
        labelSlot={
          badge === "fast-delivery" ? (
            <Label
              appearance="gradient"
              leadingIcon={<img alt="" src="/icons/fast-delivery.svg" />}
              size="sm"
              variant="success"
            >
              ارسال سریع
            </Label>
          ) : undefined
        }
        leftSlot={
          <Button asChild size="small" variant="link-ghost">
            <Link aria-label={`مشاهده همه ${title}`} href={href}>
              مشاهده همه
              <ChevronLeft aria-hidden="true" />
            </Link>
          </Button>
        }
        subtitle={subtitle}
        title={<span id={`${title}-heading`}>{title}</span>}
      />
      <ProductsSlider items={items} />
    </section>
  );
}
