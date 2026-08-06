import Link from "next/link";
import SectionHeader from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import { ProductsSlider } from "@/features/products/components/products-slider";
import { listArticleRelatedProducts } from "@/features/products/services/products.server";
import type { MagazineArticle } from "../types";

type ArticleRelatedProductsProps = {
  article: Pick<MagazineArticle, "title" | "categories" | "tags">;
};

/** Uses the same product-detail carousel with products ranked from editorial signals. */
export async function ArticleRelatedProducts({ article }: Readonly<ArticleRelatedProductsProps>) {
  let products: Awaited<ReturnType<typeof listArticleRelatedProducts>> = [];
  try {
    products = await listArticleRelatedProducts({
      title: article.title,
      terms: [...article.categories.map((category) => category.name), ...article.tags.map((tag) => tag.name)],
    });
  } catch {
    // Product recommendations should not make an otherwise public article unavailable.
    return null;
  }
  const availableProducts = products.filter((product) => product.inStock);

  if (!availableProducts.length) return null;

  return (
    <section aria-label="پیشنهادهای مرتبط با مقاله">
      <SectionHeader
        leftSlot={
          <Button asChild size="small" variant="link-ghost">
            <Link href="/products?orderby=popularity" prefetch={false}>مشاهده همه</Link>
          </Button>
        }
        subtitle="کادوهایی متناسب با موضوع این مقاله"
        title="پیشنهادهای مرتبط"
      />
      <ProductsSlider items={availableProducts} />
    </section>
  );
}
