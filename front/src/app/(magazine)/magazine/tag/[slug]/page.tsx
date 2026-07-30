import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Divider } from "@/components/ui/divider";
import { MagazineCard } from "@/features/magazine/components/magazine-card";
import { getMagazineTagBySlug, listMagazineArticles } from "@/features/magazine/services/magazine.server";

type Params = { slug: string };

async function loadTag(slug: string) {
  const tag = await getMagazineTagBySlug(slug);
  if (!tag) return null;
  const articles = await listMagazineArticles({ tag: tag.id, perPage: 12 });
  return { tag, articles };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await loadTag(slug);
  if (!page) return { title: "کادوچی | برچسب پیدا نشد" };
  return { title: `کادوچی | ${page.tag.name}`, description: `مقاله‌های مجله کادوچی با برچسب ${page.tag.name}.`, alternates: { canonical: `/magazine/tag/${page.tag.slug}` } };
}

export default async function MagazineTagPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const page = await loadTag(slug);
  if (!page) notFound();
  const { tag, articles } = page;
  return <>
    <Divider />
    <Breadcrumb items={[{ label: "خانه", href: "/" }, { label: "مجله", href: "/magazine" }, { label: tag.name }]} />
    <Divider />
    <section className="border-b border-border-low-emphasis bg-surface-soft px-16 py-32 min-[768px]:py-48"><div className="mx-auto w-full max-w-[1200px]"><Link className="font-sans text-label-14 text-primary no-underline" href="/magazine">مجله کادوچی</Link><h1 className="mt-12 mb-0 font-sans text-heading-32 font-extrabold leading-[var(--text-heading-32--line-height)] text-surface-neutral-high-emphasis">{tag.name}</h1><p className="mt-12 mb-0 font-sans text-body-16 text-surface-neutral-mid-emphasis">مقاله‌های مرتبط با این برچسب.</p></div></section>
    <section aria-label={`مقاله‌های ${tag.name}`} className="mx-auto w-full max-w-[1200px] px-16 py-32 min-[768px]:py-48">{articles.items.length ? <div className="grid gap-16 min-[640px]:grid-cols-2 min-[1024px]:grid-cols-3">{articles.items.map((article) => <MagazineCard article={article} key={article.id} />)}</div> : <div className="rounded-[var(--radius-l)] border border-dashed border-border-high-emphasis px-24 py-48 text-center font-sans text-body-14 text-surface-neutral-mid-emphasis">هنوز مقاله‌ای با این برچسب منتشر نشده است.</div>}</section>
  </>;
}
