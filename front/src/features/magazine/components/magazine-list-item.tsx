import Image from "next/image";
import Link from "next/link";
import { BookOpen, Clock3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMagazineDate } from "../utils/article-text";
import type { MagazineArticle } from "../types";

type MagazineListItemProps = {
  article: MagazineArticle;
  /** The article page sidebar uses a deliberately compact 80px thumbnail. */
  compact?: boolean;
};

/** A compact, text-led article card for the magazine's latest-post list. */
export function MagazineListItem({ article, compact = false }: Readonly<MagazineListItemProps>) {
  const category = article.categories[0];

  return (
    <article dir="rtl">
      <Link
        aria-label={`مطالعه ${article.title}`}
        className={cn(
          "group grid overflow-hidden rounded-[var(--radius-l)] border border-border-low-emphasis bg-surface-background p-8 text-right no-underline transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          compact
            ? "h-96 grid-cols-[80px_minmax(0,1fr)] gap-12"
            : "h-128 grid-cols-[112px_minmax(0,1fr)] gap-12 min-[640px]:h-160 min-[640px]:grid-cols-[144px_minmax(0,1fr)] min-[640px]:gap-16",
        )}
        href={`/magazine/${article.slug}`}
        prefetch={false}
      >
        <div className={cn(
          "relative aspect-square overflow-hidden rounded-[var(--radius-m)] bg-surface-neutral-high-emphasis",
          compact ? "size-80" : "size-112 min-[640px]:size-144",
        )}>
          {article.image ? (
            <Image
              alt={article.image.alt || article.title}
              className="object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none"
              fill
              loading="lazy"
              quality={60}
              sizes={compact ? "80px" : "(min-width: 640px) 144px, 112px"}
              src={article.image.url}
            />
          ) : <span aria-hidden className="absolute inset-0 bg-surface-neutral-high-emphasis" />}
        </div>

        <div className="flex min-w-0 flex-col justify-center overflow-hidden">
          {!compact ? (
            <div className="flex items-center gap-6 font-sans text-label-12 text-primary">
              <BookOpen aria-hidden size={14} strokeWidth={1.75} />
              <span className="truncate">{category?.name ?? "مجله کادوچی"}</span>
            </div>
          ) : null}
          <h3 className={cn(
            "mb-0 font-sans text-title-16 font-bold leading-[var(--text-title-16--line-height)] text-surface-neutral-high-emphasis transition-colors group-hover:text-primary",
            compact ? "line-clamp-2" : "mt-6 line-clamp-1 min-[640px]:line-clamp-2 min-[640px]:text-title-18 min-[640px]:leading-[var(--text-title-18--line-height)]",
          )}>
            {article.title}
          </h3>
          {article.excerpt ? (
            <p className={cn(
              "mb-0 overflow-hidden text-ellipsis whitespace-nowrap font-sans text-body-12 leading-[var(--text-body-12--line-height)] text-surface-neutral-mid-emphasis",
              compact ? "mt-4" : "mt-4 min-[640px]:mt-6 min-[640px]:text-body-14 min-[640px]:leading-[var(--text-body-14--line-height)]",
            )}>
              {article.excerpt}
            </p>
          ) : null}
          {!compact ? (
            <div className="mt-6 flex items-center gap-x-12 font-sans text-label-12 text-surface-neutral-low-emphasis min-[640px]:mt-10">
              <time className="truncate" dateTime={article.publishedAt}>{formatMagazineDate(article.publishedAt)}</time>
              <span className="inline-flex shrink-0 items-center gap-4"><Clock3 aria-hidden size={14} />{article.readingTime} دقیقه مطالعه</span>
            </div>
          ) : null}
        </div>
      </Link>
    </article>
  );
}
