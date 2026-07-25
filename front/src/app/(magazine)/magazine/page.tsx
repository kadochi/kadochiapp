import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Label } from "@/components/ui/label";
import { MagazineCard } from "@/features/magazine/components/magazine-card";
import { listMagazineArticles } from "@/features/magazine/services/magazine.server";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "مجله کادوچی | ایده و راهنمای هدیه",
  description: "ایده‌های انتخاب هدیه، راهنمای خرید گل و کیک و نکته‌هایی برای ساختن لحظه‌های به‌یادماندنی در مجله کادوچی.",
  alternates: { canonical: "/magazine" },
  openGraph: {
    title: "مجله کادوچی | ایده و راهنمای هدیه",
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
  const rest = articles.slice(1);

  return (
    <>
      <Breadcrumb items={[{ label: "خانه", href: "/" }, { label: "مجله" }]} />
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
            <Link className="group grid overflow-hidden rounded-[var(--radius-xl)] bg-surface-soft text-inherit no-underline min-[768px]:grid-cols-[1.05fr_1fr]" href={`/magazine/${lead.slug}`}>
              <div className="relative aspect-[16/10] overflow-hidden bg-primary-container min-[768px]:order-2 min-[768px]:aspect-auto min-[768px]:min-h-360">
                {lead.image ? <img alt={lead.image.alt || lead.title} className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105" fetchPriority="high" src={lead.image.url} /> : <span className="absolute inset-0 bg-[linear-gradient(145deg,var(--color-primary),var(--color-secondary))]" />}
              </div>
              <div className="flex flex-col justify-center p-24 min-[768px]:order-1 min-[768px]:p-48">
                {lead.categories[0] ? <span className="font-sans text-label-14 text-primary">{lead.categories[0].name}</span> : null}
                <h3 className="mt-12 mb-0 font-sans text-heading-24 font-extrabold leading-[var(--text-heading-24--line-height)] text-surface-neutral-high-emphasis min-[768px]:text-heading-32 min-[768px]:leading-[var(--text-heading-32--line-height)]">{lead.title}</h3>
                <p className="mt-16 mb-0 line-clamp-3 font-sans text-body-16 leading-[var(--text-body-16--line-height)] text-surface-neutral-mid-emphasis">{lead.excerpt}</p>
                <span className="mt-24 inline-flex items-center gap-8 font-sans text-label-14 font-bold text-primary">خواندن مقاله <ArrowLeft aria-hidden size={18} /></span>
              </div>
            </Link>
            {rest.length ? <div className="mt-24 grid gap-16 min-[640px]:grid-cols-2 min-[1024px]:grid-cols-3">{rest.map((article) => <MagazineCard article={article} key={article.id} />)}</div> : null}
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
