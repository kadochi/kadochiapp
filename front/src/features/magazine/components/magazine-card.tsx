import Link from "next/link";
import Image from "next/image";
import { BookOpen, ChevronLeft, Clock3 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MagazineArticle } from "../types";

type MagazineCardProps = {
  article: MagazineArticle;
  className?: string;
  priority?: boolean;
};

/** Image-led editorial card used consistently in rails and grids. */
export function MagazineCard({ article, className, priority = false }: Readonly<MagazineCardProps>) {
  const category = article.categories[0];

  return (
    <article className={cn("h-full w-full", className)} dir="rtl">
      <Link
        aria-label={`مطالعه ${article.title}`}
        className="group relative flex aspect-[1.35/1] min-h-[220px] w-full overflow-hidden rounded-[var(--radius-xl)] bg-surface-neutral-high-emphasis text-on-primary no-underline shadow-[0_1px_0_0_var(--color-border-low-emphasis)] transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary motion-reduce:transition-none"
        href={`/magazine/${article.slug}`}
        prefetch={false}
      >
        {article.image ? (
          <Image
            alt={article.image.alt || article.title}
            className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none"
            fetchPriority={priority ? "high" : "auto"}
            fill
            loading={priority ? undefined : "lazy"}
            preload={priority}
            quality={60}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            src={article.image.url}
          />
        ) : (
          <span aria-hidden className="absolute inset-0 bg-surface-neutral-high-emphasis" />
        )}

        {/* The gradient keeps editorial copy readable over every image crop. */}
        <span aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.04)_22%,rgba(0,0,0,0.2)_45%,rgba(0,0,0,0.9)_100%)]" />

        <div className="relative z-10 flex min-w-0 flex-1 flex-col justify-between p-16 text-right min-[600px]:p-20">
          <span className="inline-flex w-fit items-center gap-6 self-end rounded-rounded bg-white/80 px-12 py-8 font-sans text-label-12 font-regular leading-[var(--text-label-12--line-height)] text-on-primary-container backdrop-blur-sm">
            <BookOpen aria-hidden size={16} strokeWidth={1.75} />
            {category?.name ?? "مجله"}
          </span>

          <div>
            <h3 className="m-0 line-clamp-2 font-sans text-title-18 font-bold leading-[var(--text-title-18--line-height)] text-white min-[600px]:text-heading-24 min-[600px]:leading-[var(--text-heading-24--line-height)]">
              {article.title}
            </h3>
            {article.excerpt ? (
              <p className="mt-8 mb-0 line-clamp-2 font-sans text-body-14 font-regular leading-[var(--text-body-14--line-height)] text-white/90 min-[600px]:text-body-16 min-[600px]:leading-[var(--text-body-16--line-height)]">
                {article.excerpt}
              </p>
            ) : null}
            <div className="mt-16 flex items-center justify-between gap-12 font-sans text-label-12 font-bold leading-[var(--text-label-12--line-height)] text-white min-[600px]:text-label-14 min-[600px]:leading-[var(--text-label-14--line-height)]">
              <span className="inline-flex items-center gap-6">
                <Clock3 aria-hidden size={16} strokeWidth={1.75} />
                {article.readingTime} دقیقه مطالعه
              </span>
              <span className="inline-flex shrink-0 items-center gap-4">
                مشاهده مقاله
                <ChevronLeft aria-hidden size={18} strokeWidth={2} />
              </span>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
