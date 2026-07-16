import SectionHeader from "@/components/layout/section-header";
import { Label } from "@/components/ui/label";
import { ExpandableContent } from "./expandable-content";
import type { Product } from "../types";

export type ProductDescriptionProps = {
  product: Product;
};

/** Renders the full description HTML, clamped via a low-level client island. */
export function ProductDescription({ product }: Readonly<ProductDescriptionProps>) {
  const html = product.description || product.shortDescription;
  if (!html) return null;

  const category = product.categories[0];

  return (
    <section>
      <SectionHeader
        as="h3"
        title="درباره محصول"
        subtitle="توضیحات و بررسی"
        leftSlot={
          category ? (
            <Label appearance="soft" size="sm" variant="secondary">
              {category.name}
            </Label>
          ) : null
        }
      />
      <div className="px-16">
        <ExpandableContent>
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </ExpandableContent>
      </div>
    </section>
  );
}
