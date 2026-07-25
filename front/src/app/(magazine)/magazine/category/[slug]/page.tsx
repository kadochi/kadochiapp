import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { MagazineCard } from "@/features/magazine/components/magazine-card";
import { getMagazineCategoryBySlug, listMagazineArticles } from "@/features/magazine/services/magazine.server";

type Params = { slug: string };

async function loadCategory(slug: string) {
  const category = await getMagazineCategoryBySlug(slug);
  if (!category) return null;
  const articles = await listMagazineArticles({ category: category.id, perPage: 12 });
  return { category, articles };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await loadCategory(slug);
  if (!page) return { title: "موضوع پیدا نشد | مجله کادوچی" };
  return {
    title: `${page.category.name} | مجله کادوچی`,
    description: `مقاله‌ها و راهنماهای مجله کادوچی در موضوع ${page.category.name}.`,
    alternates: { canonical: `/magazine/category/${page.category.slug}` },
  };
}

export default async function MagazineCategoryPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const page = await loadCategory(slug);
  if (!page) notFound();
  const { category, articles } = page;

  return (
    <>
      <Breadcrumb items={[{ label: "خانه", href: "/" }, { label: "مجله", href: "/magazine" }, { label: category.name }]} />
      <section className="border-b border-border-low-emphasis bg-surface-soft px-16 py-32 min-[768px]:py-48">
        <div className="mx-auto w-full max-w-[1200px]">
          <Link className="font-sans text-label-14 text-primary no-underline" href="/magazine">مجله کادوچی</Link>
          <h1 className="mt-12 mb-0 font-sans text-heading-32 font-extrabold leading-[var(--text-heading-32--line-height)] text-surface-neutral-high-emphasis">{category.name}</h1>
          <p className="mt-12 mb-0 font-sans text-body-16 text-surface-neutral-mid-emphasis">مقاله‌ها، ایده‌ها و راهنماهای این موضوع.</p>
        </div>
      </section>
      <section className="mx-auto w-full max-w-[1200px] px-16 py-32 min-[768px]:py-48" aria-label={`مقاله‌های ${category.name}`}>
        {articles.items.length ? <div className="grid gap-16 min-[640px]:grid-cols-2 min-[1024px]:grid-cols-3">{articles.items.map((article) => <MagazineCard article={article} key={article.id} />)}</div> : <div className="rounded-[var(--radius-l)] border border-dashed border-border-high-emphasis px-24 py-48 text-center font-sans text-body-14 text-surface-neutral-mid-emphasis">هنوز مقاله‌ای در این موضوع منتشر نشده است.</div>}
      </section>
    </>
  );
}
