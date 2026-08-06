import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { notFound } from "next/navigation";
import { Container } from "@/components/layout/container";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Divider } from "@/components/ui/divider";
import { Label } from "@/components/ui/label";
import { MagazineCard } from "@/features/magazine/components/magazine-card";
import { MagazineDiscoverySidebar } from "@/features/magazine/components/magazine-discovery-sidebar";
import { MagazinePagination } from "@/features/magazine/components/magazine-pagination";
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

type MagazinePageProps = {
  searchParams: Promise<{ page?: string | string[] }>;
};

function magazinePageNumber(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Number(raw);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export default async function MagazinePage({ searchParams }: MagazinePageProps) {
  const page = magazinePageNumber((await searchParams).page);
  const [archive, bento] = await Promise.all([
    listMagazineArticles({ page, perPage: 12 }).catch(() => ({
      items: [],
      page,
      perPage: 12,
      total: 0,
      totalPages: 0,
    })),
    listMagazineArticles({ perPage: 4 }).catch(() => ({
      items: [],
      page: 1,
      perPage: 4,
      total: 0,
      totalPages: 0,
    })),
  ]);
  if (archive.totalPages && page > archive.totalPages) notFound();
  const { items: articles, total, totalPages } = archive;
  const bentoArticles = bento.items.length ? bento.items : articles.slice(0, 4);
  const lead = bentoArticles[0];
  const supporting = bentoArticles.slice(1, 4);
  const bentoIds = new Set(bentoArticles.map((article) => article.id));
  const latest = page === 1 ? articles.filter((article) => !bentoIds.has(article.id)) : articles;
  const popular = page === 1 ? bentoArticles.slice(1) : articles.slice(0, 3);
  const categories = Array.from(
    new Map(articles.flatMap((article) => article.categories).map((category) => [category.id, category])).values(),
  );

  return (
    <>
      <Divider />
      <Breadcrumb className="mx-auto max-w-[1440px]" items={[{ label: "خانه", href: "/" }, { label: "مجله" }]} />
      <Divider />
      <section className="border-b border-border-low-emphasis py-32 min-[768px]:py-48" aria-labelledby="magazine-title">
        <Container className="max-w-[1440px]">
          <div className="flex items-start gap-16" dir="rtl">
            <span aria-hidden className="flex size-64 shrink-0 items-center justify-center rounded-[var(--radius-xl)] bg-primary-container text-primary"><BookOpen size={32} strokeWidth={1.75} /></span>
            <div>
              <h1 className="m-0 font-sans text-heading-24 font-extrabold leading-[var(--text-heading-24--line-height)] text-surface-neutral-high-emphasis" id="magazine-title">مجله کادوچی</h1>
              <p className="mt-8 mb-0 max-w-[680px] font-sans text-body-16 leading-[var(--text-body-16--line-height)] text-surface-neutral-mid-emphasis">ایده، راهنما و داستان‌هایی برای انتخاب هدیه‌ای که حس خوبش ماندگار بماند</p>
            </div>
          </div>
          {categories.length ? (
            <nav aria-label="موضوع‌های مجله" className="mt-20 flex flex-wrap gap-8">
              {categories.map((category) => (
                <Link className="rounded-rounded border border-border-mid-emphasis bg-surface-background px-12 py-8 font-sans text-label-14 text-surface-neutral-mid-emphasis no-underline transition-colors hover:border-primary hover:text-primary" href={`/magazine/category/${category.slug}`} key={category.id} prefetch={false}>
                  {category.name}
                </Link>
              ))}
            </nav>
          ) : null}
        </Container>
      </section>

      <Container className="max-w-[1440px]" py="xl">
        <div className="mb-20 flex items-center justify-between gap-12" dir="rtl">
          <h2 className="m-0 font-sans text-heading-24 font-bold leading-[var(--text-heading-24--line-height)] text-surface-neutral-high-emphasis">مقاله‌ها</h2>
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
            <div className="mt-40">
              <MagazineDiscoverySidebar latest={latest} popular={popular} variant="archive" />
              <MagazinePagination page={page} totalPages={totalPages} />
            </div>
          </>
        ) : (
          <div className="rounded-[var(--radius-l)] border border-dashed border-border-high-emphasis px-24 py-48 text-center">
            <h3 className="m-0 font-sans text-title-18 font-bold text-surface-neutral-high-emphasis">مقاله‌ای منتشر نشده است</h3>
            <p className="mt-8 mb-0 font-sans text-body-14 text-surface-neutral-mid-emphasis">اولین مقاله مجله را از بخش «مجله» در پیشخوان وردپرس منتشر کنید.</p>
          </div>
        )}
      </Container>
    </>
  );
}
