import Link from "next/link";
import SectionHeader from "@/components/layout/section-header";
import { Chip } from "@/components/ui/chip";
import type { MagazineTag } from "../types";

/** Links article tags to the matching magazine archive. */
export function MagazineTags({ tags }: Readonly<{ tags: MagazineTag[] }>) {
  if (!tags.length) return null;

  return (
    <section aria-label="برچسب‌های مقاله">
      <SectionHeader as="h2" title="برچسب‌ها" subtitle="موضوع‌های مرتبط با این مقاله" />
      <div className="flex flex-wrap gap-8 bg-surface-background px-16 pb-16 [direction:rtl]">
        {tags.map((tag) => (
          <Chip asChild key={tag.id} size="md" variant="outline">
            <Link href={`/magazine/tag/${encodeURIComponent(tag.slug)}`} prefetch={false}>{tag.name}</Link>
          </Chip>
        ))}
      </div>
    </section>
  );
}
