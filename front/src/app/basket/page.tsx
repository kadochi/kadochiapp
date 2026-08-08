import type { Metadata } from "next";

import { Header } from "@/components/layout/header";
import { BasketPage } from "@/features/cart/components/basket-page";
import { listCartCrossSellProducts } from "@/features/cart/services/cross-sells.server";
import { executeCart } from "@/features/cart/services/cart.server";
import type { Product } from "@/features/products/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "کادوچی | سبد خرید",
  robots: { index: false, follow: false },
};

export default async function BasketRoute() {
  let initialCart = null;
  let initialCrossSells: Product[] = [];
  let loadError: string | undefined;
  try {
    const result = await executeCart({ method: "GET", path: "/wp-json/wc/store/v1/cart" }, crypto.randomUUID());
    initialCart = result.cart;
    try {
      initialCrossSells = await listCartCrossSellProducts(
        result.cart.items.filter((item) => !item.isCrossSell).map((item) => item.productId),
        crypto.randomUUID(),
      );
    } catch {
      // Cart availability is more important than a non-essential recommendation rail.
    }
  } catch {
    loadError = "دریافت اطلاعات سبد خرید ممکن نشد. دوباره تلاش کنید.";
  }
  return <><Header variant="internal" title="سبد خرید" backUrl="/products" /><BasketPage initialCart={initialCart} initialCrossSells={initialCrossSells} loadError={loadError} /></>;
}
