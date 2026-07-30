import { cache, Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Clock3, UserRound } from "lucide-react";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Divider } from "@/components/ui/divider";
import { MagazineCard } from "@/features/magazine/components/magazine-card";
import { MagazineComment } from "@/features/magazine/components/magazine-comment";
import { MagazineComments } from "@/features/magazine/components/magazine-comments";
import { MagazineTags } from "@/features/magazine/components/magazine-tags";
import { getMagazineArticleBySlug, listMagazineArticles } from "@/features/magazine/services/magazine.server";
import { formatMagazineDate } from "@/features/magazine/utils/article-text";
import type { ServiceError } from "@/lib/http/errors";
import type { UpstreamError } from "@/lib/http/upstream";

type Params = { slug: string };

const loadArticle = cache(async (slug: string) => {
  try {
    return await getMagazineArticleBySlug(slug);
  } catch (error) {
    const detail = (error as ServiceError | UpstreamError)?.detail;
    if (detail?.code === "not_found") return null;
    throw error;
  }
});

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const article = await loadArticle(slug);
  const canonical = `/magazine/${slug}`;
  if (!article) return { title: "کادوچی | مقاله پیدا نشد", alternates: { canonical } };

  return {
    title: `کادوچی | ${article.title}`,
    description: article.excerpt.slice(0, 160),
    alternates: { canonical },
    openGraph: {
      type: "article",
      title: `کادوچی | ${article.title}`,
      description: article.excerpt.slice(0, 160),
      locale: "fa_IR",
      publishedTime: article.publishedAt,
      modifiedTime: article.modifiedAt,
      authors: [article.authorName],
      images: article.image ? [{ url: article.image.url, alt: article.image.alt }] : undefined,
    },
  };
}

export default async function MagazineArticlePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const article = await loadArticle(slug);
  if (!article) notFound();
  const category = article.categories[0];
  const related = category
    ? (await listMagazineArticles({ category: category.id, exclude: [article.id], perPage: 3 })).items
    : (await listMagazineArticles({ exclude: [article.id], perPage: 3 })).items;
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    author: { "@type": "Organization", name: article.authorName },
    dateModified: article.modifiedAt,
    datePublished: article.publishedAt,
    description: article.excerpt,
    headline: article.title,
    image: article.image?.url,
    mainEntityOfPage: `https://kadochi.com/magazine/${article.slug}`,
    publisher: { "@type": "Organization", name: "کادوچی", logo: { "@type": "ImageObject", url: "https://kadochi.com/images/logo.svg" } },
  };

  return (
    <>
      <Divider />
      <Breadcrumb items={[{ label: "خانه", href: "/" }, { label: "مجله", href: "/magazine" }, ...(category ? [{ label: category.name, href: `/magazine/category/${category.slug}` }] : []), { label: article.title }]} />
      <Divider />
      <article className="mx-auto w-full max-w-[900px] px-16 py-32 min-[768px]:py-48">
        <div className="relative mx-auto aspect-[16/9] max-w-[900px] overflow-hidden rounded-[var(--radius-xl)] bg-primary-container">
          {article.image ? (
            <Image
              alt={article.image.alt || article.title}
              className="object-cover"
              fill
              preload
              sizes="100vw"
              src={article.image.url}
            />
          ) : <span aria-hidden className="absolute inset-0 bg-[linear-gradient(145deg,var(--color-primary),var(--color-secondary))]" />}
        </div>

        <header className="mx-auto max-w-[760px] text-right">
          <div className="mt-20 flex flex-wrap items-center gap-x-16 gap-y-8 font-sans text-label-14 text-surface-neutral-low-emphasis">
            {category ? <Link className="font-bold text-primary no-underline" href={`/magazine/category/${category.slug}`}>{category.name}</Link> : <span className="font-bold text-primary">مجله کادوچی</span>}
            <span className="inline-flex items-center gap-6"><UserRound aria-hidden size={16} />{article.authorName}</span>
            <time dateTime={article.publishedAt}>{formatMagazineDate(article.publishedAt)}</time>
            <span className="inline-flex items-center gap-6"><Clock3 aria-hidden size={16} />{article.readingTime} دقیقه مطالعه</span>
          </div>
          <h1 className="mt-12 mb-0 font-sans text-heading-32 font-extrabold leading-[var(--text-heading-32--line-height)] text-surface-neutral-high-emphasis min-[768px]:text-heading-40 min-[768px]:leading-[var(--text-heading-40--line-height)]">{article.title}</h1>
        </header>

        <div className="magazine-content mx-auto mt-32 max-w-[720px] font-sans text-body-16 leading-[2.1] text-surface-neutral-mid-emphasis" dangerouslySetInnerHTML={{ __html: article.content }} />
      </article>

      {article.tags.length ? <><Divider variant="spacer" /><MagazineTags tags={article.tags} /></> : null}
      <Divider variant="spacer" />
      <MagazineComment nextPath={`/magazine/${article.slug}`} postId={article.id} />
      <Divider variant="spacer" />
      <Suspense fallback={<div aria-hidden className="flex flex-col gap-16 px-16 py-32"><div className="h-40 animate-pulse rounded-rounded bg-surface-soft" /><div className="h-40 animate-pulse rounded-rounded bg-surface-soft" /></div>}>
        <MagazineComments postId={article.id} />
      </Suspense>

      {related.length ? (
        <section className="border-t border-border-low-emphasis bg-surface-soft py-32 min-[768px]:py-48" aria-labelledby="related-magazine-heading">
          <div className="mx-auto w-full max-w-[1200px] px-16">
            <h2 className="m-0 font-sans text-heading-24 font-bold leading-[var(--text-heading-24--line-height)] text-surface-neutral-high-emphasis" id="related-magazine-heading">مطالعه‌های مرتبط</h2>
            <div className="mt-20 grid gap-16 min-[640px]:grid-cols-2 min-[1024px]:grid-cols-3">{related.map((item) => <MagazineCard article={item} key={item.id} />)}</div>
          </div>
        </section>
      ) : null}
      <script dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} type="application/ld+json" />
    </>
  );
}
