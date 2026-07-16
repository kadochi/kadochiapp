import SectionHeader from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import { listSimilarProducts } from "../services/products.server";
import { ProductsSlider } from "./products-slider";

export type SimilarProductsProps = {
  categoryId?: number;
  excludeId: number;
};

/** Fetches related products and hands them to the existing slider. */
export async function SimilarProducts({ categoryId, excludeId }: Readonly<SimilarProductsProps>) {
  const products = await listSimilarProducts({ categoryId, excludeId });
  if (products.length === 0) return null;

  const allHref = categoryId ? `/products?category=${categoryId}` : "/products?orderby=popularity";

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
      <ProductsSlider items={products} />
    </section>
  );
}
