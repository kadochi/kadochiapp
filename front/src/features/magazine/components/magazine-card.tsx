import Link from "next/link";
import Image from "next/image";
import { BookOpen, ChevronLeft, Clock3 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MagazineArticle } from "../types";

type MagazineCardProps = {
  article: MagazineArticle;
  className?: string;
  priority?: boolean;
  /** A condensed type scale for the narrow article-page sidebar. */
  compact?: boolean;
  /** Keeps the title at 18px for dense horizontal rails. */
  titleSize?: "default" | "18";
};

/** Image-led editorial card used consistently in rails and grids. */
export function MagazineCard({ article, className, priority = false, compact = false, titleSize = "default" }: Readonly<MagazineCardProps>) {
  const category = article.categories[0];

  return (
    <article className={cn("h-full w-full", className)} dir="rtl">
      <Link
        aria-label={`مطالعه ${article.title}`}
        className={cn(
          "group relative flex w-full overflow-hidden rounded-[var(--radius-xl)] bg-surface-neutral-high-emphasis text-on-primary no-underline shadow-[0_1px_0_0_var(--color-border-low-emphasis)] transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary motion-reduce:transition-none",
          compact ? "aspect-[1.65/1] min-h-[160px]" : "aspect-[1.35/1] min-h-[220px]",
        )}
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
            sizes={compact ? "(min-width: 1024px) 320px, 100vw" : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"}
            src={article.image.url}
          />
        ) : (
          <span aria-hidden className="absolute inset-0 bg-surface-neutral-high-emphasis" />
        )}

        {/* The gradient keeps editorial copy readable over every image crop. */}
        <span aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.04)_22%,rgba(0,0,0,0.2)_45%,rgba(0,0,0,0.9)_100%)]" />

        <div className={cn(
          "relative z-10 flex min-w-0 flex-1 flex-col justify-between text-right",
          compact ? "p-12" : "p-16 min-[600px]:p-20",
        )}>
          <span className={cn(
            "inline-flex w-fit items-center gap-6 self-end rounded-rounded bg-white/80 font-sans font-regular text-on-primary-container backdrop-blur-sm",
            compact ? "px-8 py-4 text-label-12 leading-[var(--text-label-12--line-height)]" : "px-12 py-8 text-label-12 leading-[var(--text-label-12--line-height)]",
          )}>
            <BookOpen aria-hidden size={compact ? 14 : 16} strokeWidth={1.75} />
            {category?.name ?? "مجله"}
          </span>

          <div>
            <h3 className={cn(
              "m-0 line-clamp-2 font-sans font-bold text-white",
              compact || titleSize === "18"
                ? "text-title-18 leading-[var(--text-title-18--line-height)]"
                : "text-title-18 leading-[var(--text-title-18--line-height)] min-[600px]:text-heading-24 min-[600px]:leading-[var(--text-heading-24--line-height)]",
            )}>
              {article.title}
            </h3>
            {article.excerpt ? (
              <p className={cn(
                "mb-0 font-sans font-regular text-white/90",
                compact ? "mt-4 line-clamp-1 text-body-12 leading-[var(--text-body-12--line-height)]" : "mt-8 line-clamp-2 text-body-14 leading-[var(--text-body-14--line-height)] min-[600px]:text-body-16 min-[600px]:leading-[var(--text-body-16--line-height)]",
              )}>
                {article.excerpt}
              </p>
            ) : null}
            <div className={cn(
              "flex items-center justify-between gap-12 font-sans font-bold text-white",
              compact ? "mt-8 text-label-12 leading-[var(--text-label-12--line-height)]" : "mt-16 text-label-12 leading-[var(--text-label-12--line-height)] min-[600px]:text-label-14 min-[600px]:leading-[var(--text-label-14--line-height)]",
            )}>
              <span className="inline-flex items-center gap-6">
                <Clock3 aria-hidden size={compact ? 14 : 16} strokeWidth={1.75} />
                {article.readingTime} دقیقه مطالعه
              </span>
              <span className="inline-flex shrink-0 items-center gap-4">
                مشاهده مقاله
                <ChevronLeft aria-hidden size={compact ? 16 : 18} strokeWidth={2} />
              </span>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
