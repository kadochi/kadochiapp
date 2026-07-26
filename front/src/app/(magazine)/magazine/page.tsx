import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Divider } from "@/components/ui/divider";
import { Label } from "@/components/ui/label";
import { MagazineCard } from "@/features/magazine/components/magazine-card";
import { listMagazineArticles } from "@/features/magazine/services/magazine.server";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "کادوچی | مجله؛ ایده و راهنمای هدیه",
  description: "ایده‌های انتخاب هدیه، راهنمای خرید گل و کیک و نکته‌هایی برای ساختن لحظه‌های به‌یادماندنی در مجله کادوچی.",
  alternates: { canonical: "/magazine" },
  openGraph: {
    title: "کادوچی | مجله؛ ایده و راهنمای هدیه",
    description: "راهنمای انتخاب هدیه، گل و کیک از تحریریه کادوچی.",
    locale: "fa_IR",
    type: "website",
  },
};

export default async function MagazinePage() {
  const { items: articles, total } = await listMagazineArticles({ perPage: 12 });
  const categories = Array.from(
    new Map(articles.flatMap((article) => article.categories).map((category) => [category.id, category])).values(),
  );
  const lead = articles[0];
  const supporting = articles.slice(1, 4);
  const remaining = articles.slice(4);

  return (
    <>
      <Divider />
      <Breadcrumb items={[{ label: "خانه", href: "/" }, { label: "مجله" }]} />
      <Divider />
      <section className="border-b border-border-low-emphasis bg-secondary-container px-16 py-32 min-[768px]:py-48" aria-labelledby="magazine-title">
        <div className="mx-auto w-full max-w-[1200px]">
          <div className="inline-flex items-center gap-8 rounded-rounded bg-primary-container px-12 py-8 font-sans text-label-14 text-primary">
            <BookOpen aria-hidden size={18} /> مجله کادوچی
          </div>
          <h1 className="mt-16 mb-0 font-sans text-heading-32 font-extrabold leading-[var(--text-heading-32--line-height)] text-surface-neutral-high-emphasis min-[768px]:text-heading-40 min-[768px]:leading-[var(--text-heading-40--line-height)]" id="magazine-title">
            برای لحظه‌هایی که هدیه می‌گیرند
          </h1>
          <p className="mt-12 mb-0 max-w-[680px] font-sans text-body-16 leading-[var(--text-body-16--line-height)] text-surface-neutral-mid-emphasis">
            ایده، راهنما و داستان‌هایی برای انتخاب هدیه‌ای که حس خوبش ماندگار بماند.
          </p>
          {categories.length ? (
            <nav aria-label="موضوع‌های مجله" className="mt-20 flex flex-wrap gap-8">
              {categories.map((category) => (
                <Link className="rounded-rounded border border-border-mid-emphasis bg-surface-background px-12 py-8 font-sans text-label-14 text-surface-neutral-mid-emphasis no-underline transition-colors hover:border-primary hover:text-primary" href={`/magazine/category/${category.slug}`} key={category.id}>
                  {category.name}
                </Link>
              ))}
            </nav>
          ) : null}
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1200px] px-16 py-32 min-[768px]:py-48" aria-labelledby="latest-magazine-heading">
        <div className="mb-20 flex items-center justify-between gap-12">
          <h2 className="m-0 font-sans text-heading-24 font-bold leading-[var(--text-heading-24--line-height)] text-surface-neutral-high-emphasis" id="latest-magazine-heading">تازه‌ترین مقاله‌ها</h2>
          <Label appearance="soft" size="sm" variant="secondary">{new Intl.NumberFormat("fa-IR").format(total)} مقاله</Label>
        </div>

        {lead ? (
          <>
            <div className="grid gap-16 min-[900px]:grid-cols-12" dir="rtl">
              <MagazineCard article={lead} className="min-[900px]:col-span-7 [&_a]:min-[900px]:aspect-auto [&_a]:min-[900px]:min-h-[536px]" priority />
              {supporting.length ? (
                <div className="grid gap-16 min-[900px]:col-span-5 min-[900px]:grid-rows-[minmax(0,1fr)_minmax(0,1fr)]">
                  <MagazineCard article={supporting[0]} className="[&_a]:min-[900px]:aspect-auto [&_a]:min-[900px]:min-h-[260px]" />
                  {supporting.slice(1).length ? (
                    <div className="grid gap-16 min-[640px]:grid-cols-2">
                      {supporting.slice(1).map((article) => <MagazineCard article={article} className="[&_a]:min-[900px]:aspect-auto [&_a]:min-[900px]:min-h-[260px]" key={article.id} />)}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            {remaining.length ? (
              <>
                <h3 className="mt-40 mb-20 font-sans text-heading-24 font-bold leading-[var(--text-heading-24--line-height)] text-surface-neutral-high-emphasis">بیشتر بخوانید</h3>
                <div className="grid gap-16 min-[640px]:grid-cols-2 min-[1024px]:grid-cols-3">{remaining.map((article) => <MagazineCard article={article} key={article.id} />)}</div>
              </>
            ) : null}
          </>
        ) : (
          <div className="rounded-[var(--radius-l)] border border-dashed border-border-high-emphasis px-24 py-48 text-center">
            <h3 className="m-0 font-sans text-title-18 font-bold text-surface-neutral-high-emphasis">مقاله‌ای منتشر نشده است</h3>
            <p className="mt-8 mb-0 font-sans text-body-14 text-surface-neutral-mid-emphasis">اولین مقاله مجله را از بخش «مجله» در پیشخوان وردپرس منتشر کنید.</p>
          </div>
        )}
      </section>
    </>
  );
}
