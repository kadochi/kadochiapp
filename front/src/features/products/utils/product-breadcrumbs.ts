import type { Crumb } from "@/components/ui/breadcrumb";
import type { Product } from "../types";

/** Builds خانه / محصولات / {category} / {name} crumbs for a product. */
export function productBreadcrumbs(product: Pick<Product, "name" | "categories">): Crumb[] {
  const category = product.categories[0];

  return [
    { label: "خانه", href: "/" },
    { label: "محصولات", href: "/products" },
    ...(category ? [{ label: category.name, href: `/products?category=${encodeURIComponent(category.slug)}` }] : []),
    { label: product.name },
  ];
}
