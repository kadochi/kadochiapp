import { MagazineCard } from "./magazine-card";
import { MagazineListItem } from "./magazine-list-item";
import type { MagazineArticle } from "../types";

type MagazineDiscoverySidebarProps = {
  latest: readonly MagazineArticle[];
  popular: readonly MagazineArticle[];
  /** On the archive, latest stories take the wider right-hand column. */
  variant?: "archive" | "article";
};

/** Shared editorial discovery modules for the archive and article pages. */
export function MagazineDiscoverySidebar({
  latest,
  popular,
  variant = "article",
}: Readonly<MagazineDiscoverySidebarProps>) {
  const latestContent = latest.length ? (
    <div className="grid gap-12">
      {latest.map((article) => <MagazineListItem article={article} compact={variant === "article"} key={article.id} />)}
    </div>
  ) : <EmptyDiscoveryState text="مقاله‌ی دیگری برای نمایش نیست." />;

  const popularContent = popular.length ? (
    <div className="grid gap-12">
      {popular.map((article) => <MagazineCard article={article} compact={variant === "article"} key={article.id} />)}
    </div>
  ) : <EmptyDiscoveryState text="مقاله‌ای برای نمایش نیست." />;

  if (variant === "archive") {
    return (
      <div className="grid gap-32 min-[1024px]:grid-cols-12" dir="rtl">
        <section className="min-w-0 min-[1024px]:col-span-8" aria-labelledby="latest-magazine-heading">
          <h2 className="m-0 font-sans text-heading-24 font-bold leading-[var(--text-heading-24--line-height)] text-surface-neutral-high-emphasis" id="latest-magazine-heading">تازه‌ترین مقالات</h2>
          <div className="mt-20">{latestContent}</div>
        </section>
        <section className="min-w-0 min-[1024px]:col-span-4" aria-labelledby="popular-magazine-heading">
          <h2 className="m-0 font-sans text-heading-24 font-bold leading-[var(--text-heading-24--line-height)] text-surface-neutral-high-emphasis" id="popular-magazine-heading">پربازدیدترین‌ها</h2>
          <div className="mt-20">{popularContent}</div>
        </section>
      </div>
    );
  }

  return (
    <aside className="grid gap-32" aria-label="مقاله‌های بیشتر">
      <section aria-labelledby="article-latest-magazine-heading">
        <h2 className="m-0 font-sans text-heading-24 font-bold leading-[var(--text-heading-24--line-height)] text-surface-neutral-high-emphasis" id="article-latest-magazine-heading">تازه‌ترین‌ها</h2>
        <div className="mt-20">{latestContent}</div>
      </section>
      <section aria-labelledby="article-popular-magazine-heading">
        <h2 className="m-0 font-sans text-heading-24 font-bold leading-[var(--text-heading-24--line-height)] text-surface-neutral-high-emphasis" id="article-popular-magazine-heading">پربازدیدترین‌ها</h2>
        <div className="mt-20">{popularContent}</div>
      </section>
    </aside>
  );
}

function EmptyDiscoveryState({ text }: Readonly<{ text: string }>) {
  return <p className="m-0 rounded-[var(--radius-l)] border border-dashed border-border-high-emphasis px-16 py-24 text-center font-sans text-body-14 text-surface-neutral-mid-emphasis">{text}</p>;
}
