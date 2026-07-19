import Link from "next/link";

import SectionHeader from "@/components/layout/section-header";
import { Chip } from "@/components/ui/chip";
import type { Product } from "../types";

export type ProductTagsProps = {
  tags: Product["tags"];
};

/** Links product tags to the matching catalog filter. */
export function ProductTags({ tags }: Readonly<ProductTagsProps>) {
  if (tags.length === 0) return null;

  return (
    <section aria-label="تگ‌های محصول">
      <SectionHeader as="h3" title="تگ‌های محصول" subtitle="تگ‌های مرتبط با این کالا" />
      <div className="flex flex-wrap gap-8 bg-surface-background px-16 pb-16 [direction:rtl]">
        {tags.map((tag) => (
          <Chip asChild key={tag.id} size="md" variant="outline">
            <Link href={`/products?tag=${encodeURIComponent(tag.slug)}`} prefetch={false}>
              {tag.name}
            </Link>
          </Chip>
        ))}
      </div>
    </section>
  );
}
