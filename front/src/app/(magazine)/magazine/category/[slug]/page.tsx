import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Container } from "@/components/layout/container";
import { Divider } from "@/components/ui/divider";
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
  if (!page) return { title: "کادوچی | موضوع پیدا نشد" };
  return {
    title: `کادوچی | ${page.category.name}`,
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
      <Divider />
      <Breadcrumb className="mx-auto max-w-[1440px]" items={[{ label: "خانه", href: "/" }, { label: "مجله", href: "/magazine" }, { label: category.name }]} />
      <Divider />
      <section className="border-b border-border-low-emphasis bg-surface-soft py-32 min-[768px]:py-48">
        <Container className="max-w-[1440px]">
          <Link className="font-sans text-label-14 text-primary no-underline" href="/magazine">مجله کادوچی</Link>
          <h1 className="mt-12 mb-0 font-sans text-heading-24 font-extrabold leading-[var(--text-heading-24--line-height)] text-surface-neutral-high-emphasis">{category.name}</h1>
          <p className="mt-12 mb-0 font-sans text-body-16 text-surface-neutral-mid-emphasis">مقاله‌ها، ایده‌ها و راهنماهای این موضوع.</p>
        </Container>
      </section>
      <Container asChild className="max-w-[1440px]" py="xl">
      <section aria-label={`مقاله‌های ${category.name}`}>
        {articles.items.length ? <div className="grid gap-16 min-[640px]:grid-cols-2 min-[1024px]:grid-cols-3">{articles.items.map((article) => <MagazineCard article={article} key={article.id} />)}</div> : <div className="rounded-[var(--radius-l)] border border-dashed border-border-high-emphasis px-24 py-48 text-center font-sans text-body-14 text-surface-neutral-mid-emphasis">هنوز مقاله‌ای در این موضوع منتشر نشده است.</div>}
      </section>
      </Container>
    </>
  );
}
