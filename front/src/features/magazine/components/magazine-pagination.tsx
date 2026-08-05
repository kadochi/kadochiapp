import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

type MagazinePaginationProps = {
  page: number;
  totalPages: number;
};

function pageHref(page: number) {
  return page === 1 ? "/magazine" : `/magazine?page=${page}`;
}

/** Crawlable archive pagination for every published magazine article. */
export function MagazinePagination({ page, totalPages }: Readonly<MagazinePaginationProps>) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="صفحه‌بندی مقاله‌های مجله" className="mt-32 flex items-center justify-center gap-8" dir="rtl">
      {page > 1 ? (
        <Link className="inline-flex items-center gap-4 rounded-rounded border border-border-mid-emphasis px-12 py-8 font-sans text-label-14 font-bold text-surface-neutral-high-emphasis no-underline transition-colors hover:border-primary hover:text-primary" href={pageHref(page - 1)}>
          <ChevronRight aria-hidden size={18} />
          جدیدتر
        </Link>
      ) : <span aria-hidden className="inline-flex items-center gap-4 rounded-rounded border border-border-low-emphasis px-12 py-8 font-sans text-label-14 text-surface-neutral-low-emphasis"><ChevronRight size={18} />جدیدتر</span>}

      <span className="px-8 font-sans text-label-14 text-surface-neutral-mid-emphasis">صفحه {page.toLocaleString("fa-IR")} از {totalPages.toLocaleString("fa-IR")}</span>

      {page < totalPages ? (
        <Link className="inline-flex items-center gap-4 rounded-rounded border border-border-mid-emphasis px-12 py-8 font-sans text-label-14 font-bold text-surface-neutral-high-emphasis no-underline transition-colors hover:border-primary hover:text-primary" href={pageHref(page + 1)}>
          قدیمی‌تر
          <ChevronLeft aria-hidden size={18} />
        </Link>
      ) : <span aria-hidden className="inline-flex items-center gap-4 rounded-rounded border border-border-low-emphasis px-12 py-8 font-sans text-label-14 text-surface-neutral-low-emphasis">قدیمی‌تر<ChevronLeft size={18} /></span>}
    </nav>
  );
}
