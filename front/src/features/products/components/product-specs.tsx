import SectionHeader from "@/components/layout/section-header";
import type { Product } from "../types";

export type ProductSpecsProps = {
  attributes: Product["attributes"];
};

/** Renders product attributes as a real, accessible table. */
export function ProductSpecs({ attributes }: Readonly<ProductSpecsProps>) {
  if (attributes.length === 0) return null;

  return (
    <section>
      <SectionHeader as="h3" title="مشخصات محصول" subtitle="جدول ویژگی‌ها" />
      <div className="mx-16 mt-8 mb-16 overflow-hidden rounded-xl border border-border-mid-emphasis">
        <table className="w-full table-fixed border-collapse [direction:rtl]">
          <tbody>
            {attributes.map((attribute) => (
              <tr key={attribute.name} className="border-b border-border-mid-emphasis last:border-b-0 odd:bg-surface-soft even:bg-surface-background">
                <th scope="row" className="w-1/3 px-16 py-16 text-right align-middle font-sans text-label-14 font-regular leading-[var(--text-label-14--line-height)] text-surface-neutral-mid-emphasis">
                  {attribute.name}
                </th>
                <td className="px-16 py-16 text-left align-middle font-sans text-body-14 font-bold leading-[var(--text-body-14--line-height)] text-surface-neutral-high-emphasis">
                  {attribute.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
