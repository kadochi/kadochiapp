import { cache, Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Clock3, UserRound } from "lucide-react";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Container } from "@/components/layout/container";
import { Divider } from "@/components/ui/divider";
import { MagazineCard } from "@/features/magazine/components/magazine-card";
import { MagazineComment } from "@/features/magazine/components/magazine-comment";
import { MagazineComments } from "@/features/magazine/components/magazine-comments";
import { MagazineDiscoverySidebar } from "@/features/magazine/components/magazine-discovery-sidebar";
import { ArticleRelatedProducts } from "@/features/magazine/components/article-related-products";
import { MagazineViewTracker } from "@/features/magazine/components/magazine-view-tracker";
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
  const [relatedResult, latestResult] = await Promise.all([
    category
      ? listMagazineArticles({ category: category.id, exclude: [article.id], perPage: 3 })
      : listMagazineArticles({ exclude: [article.id], perPage: 3 }),
    listMagazineArticles({ exclude: [article.id], perPage: 6 }),
  ]);
  const related = relatedResult.items;
  const latest = latestResult.items.slice(0, 3);
  const popular = latestResult.items.slice(3, 6).length ? latestResult.items.slice(3, 6) : latest;
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
      <MagazineViewTracker postId={article.id} />
      <Divider />
      <Breadcrumb className="mx-auto max-w-[1440px]" items={[{ label: "خانه", href: "/" }, { label: "مجله", href: "/magazine" }, ...(category ? [{ label: category.name, href: `/magazine/category/${category.slug}` }] : []), { label: article.title }]} />
      <Divider />
      <Container className="max-w-[1440px]" py="xl">
        <div className="grid items-start gap-40 min-[1024px]:grid-cols-3" dir="rtl">
          <article className="min-w-0 min-[1024px]:col-span-2">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[var(--radius-xl)] bg-surface-neutral-high-emphasis min-[768px]:aspect-[16/9]">
              {article.image ? (
                <Image
                  alt={article.image.alt || article.title}
                  className="object-cover"
                  fill
                  preload
                  quality={75}
                  sizes="(min-width: 1024px) 940px, calc(100vw - 32px)"
                  src={article.image.url}
                />
              ) : <span aria-hidden className="absolute inset-0 bg-surface-neutral-high-emphasis" />}
              <span aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.02)_20%,rgba(0,0,0,0.86)_100%)]" />

              <header className="absolute inset-x-0 bottom-0 z-10 p-12 text-right min-[768px]:p-24">
                <div className="flex flex-wrap items-center gap-x-12 gap-y-6 font-sans text-label-12 text-white/85 min-[768px]:gap-x-16 min-[768px]:gap-y-8 min-[768px]:text-label-14">
                  {category ? <Link className="font-bold text-white no-underline hover:text-white/80" href={`/magazine/category/${category.slug}`}>{category.name}</Link> : <span className="font-bold text-white">مجله کادوچی</span>}
                  <span className="inline-flex items-center gap-6"><UserRound aria-hidden size={16} />{article.authorName}</span>
                  <time dateTime={article.publishedAt}>{formatMagazineDate(article.publishedAt)}</time>
                  <span className="inline-flex items-center gap-6"><Clock3 aria-hidden size={16} />{article.readingTime} دقیقه مطالعه</span>
                </div>
                <h1 className="mt-8 mb-0 font-sans text-heading-32 font-extrabold leading-[var(--text-heading-32--line-height)] text-white min-[768px]:mt-12">{article.title}</h1>
              </header>
            </div>

            <div className="magazine-content mt-32 w-full font-sans text-body-16 leading-[2.1] text-surface-neutral-mid-emphasis min-[768px]:px-32" dangerouslySetInnerHTML={{ __html: article.content }} />
          </article>
          <div className="min-w-0 min-[1024px]:col-span-1">
            <MagazineDiscoverySidebar latest={latest} popular={popular} />
          </div>
        </div>
      </Container>

      <Divider variant="spacer" />
      <Container className="max-w-[1440px]" px="none">
        <Suspense fallback={<div aria-hidden className="h-[280px] animate-pulse bg-surface-soft" />}>
          <ArticleRelatedProducts article={article} />
        </Suspense>
      </Container>
      {article.tags.length ? <><Divider variant="spacer" /><MagazineTags tags={article.tags} /></> : null}
      <Divider variant="spacer" />
      <MagazineComment nextPath={`/magazine/${article.slug}`} postId={article.id} />
      <Divider variant="spacer" />
      <Suspense fallback={<div aria-hidden className="flex flex-col gap-16 px-16 py-32"><div className="h-40 animate-pulse rounded-rounded bg-surface-soft" /><div className="h-40 animate-pulse rounded-rounded bg-surface-soft" /></div>}>
        <MagazineComments postId={article.id} />
      </Suspense>

      {related.length ? (
        <section className="border-t border-border-low-emphasis bg-surface-soft py-32 min-[768px]:py-48" aria-labelledby="related-magazine-heading">
          <Container className="max-w-[1440px]">
            <h2 className="m-0 font-sans text-heading-24 font-bold leading-[var(--text-heading-24--line-height)] text-surface-neutral-high-emphasis" id="related-magazine-heading">مطالعه‌های مرتبط</h2>
            <div className="mt-20 grid gap-16 min-[640px]:grid-cols-2 min-[1024px]:grid-cols-3">{related.map((item) => <MagazineCard article={item} key={item.id} />)}</div>
          </Container>
        </section>
      ) : null}
      <script dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} type="application/ld+json" />
    </>
  );
}
