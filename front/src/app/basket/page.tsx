import { Header } from "@/components/layout/header";
import { BasketPage } from "@/features/cart/components/basket-page";
import { executeCart } from "@/features/cart/services/cart.server";

export const dynamic = "force-dynamic";

export default async function BasketRoute() {
  let initialCart = null;
  let loadError: string | undefined;
  try {
    const result = await executeCart({ method: "GET", path: "/wp-json/wc/store/v1/cart" }, crypto.randomUUID());
    initialCart = result.cart;
  } catch {
    loadError = "دریافت اطلاعات سبد خرید ممکن نشد. دوباره تلاش کنید.";
  }
  return <><Header variant="internal" title="سبد خرید" backUrl="/products" /><BasketPage initialCart={initialCart} loadError={loadError} /></>;
}
