import SectionHeader from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import { listSimilarProducts } from "../services/products.server";
import { productCategoryPath } from "../utils/product-list-search";
import { ProductsSlider } from "./products-slider";

export type SimilarProductsProps = {
  category?: { id: number; slug: string };
  excludeId: number;
};

/** Fetches related products and hands them to the existing slider. */
export async function SimilarProducts({ category, excludeId }: Readonly<SimilarProductsProps>) {
  const products = await listSimilarProducts({ categoryId: category?.id, excludeId });
  const availableProducts = products.filter((product) => product.inStock);

  const allHref = category
    ? productCategoryPath(category.slug)
    : "/products?orderby=popularity";

  return (
    <section aria-label="محصولات مشابه">
      <SectionHeader
        title="محصولات مشابه"
        subtitle="کادوهای مشابه این محصول"
        leftSlot={
          <Button asChild size="small" variant="link-ghost">
            <a href={allHref}>مشاهده همه</a>
          </Button>
        }
      />
      {availableProducts.length ? (
        <ProductsSlider items={availableProducts} />
      ) : (
        <p className="px-16 py-16 text-center font-sans text-body-14 text-surface-neutral-mid-emphasis">
          محصول مشابه دیگری برای نمایش پیدا نشد.
        </p>
      )}
    </section>
  );
}
