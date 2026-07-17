import { redirect } from "next/navigation";

import { Header } from "@/components/layout/header";
import StateMessage from "@/components/layout/state-message";
import { getStoredAuthToken } from "@/features/auth/services/auth.server";
import { CheckoutFlow } from "@/features/checkout/components/checkout-flow";
import { checkoutState } from "@/features/checkout/services/checkout.server";
import { ServiceError } from "@/lib/http/errors";

export const dynamic = "force-dynamic";

export default async function CheckoutRoute() {
  if (!(await getStoredAuthToken())) redirect("/login?next=/checkout");
  let state = null;
  let loadFailed = false;
  try {
    const result = await checkoutState(crypto.randomUUID());
    state = result.state;
  } catch (error) {
    if (error instanceof ServiceError && error.detail.code === "unauthenticated") redirect("/login?next=/checkout");
    loadFailed = true;
  }
  return <><Header variant="internal" title="ثبت سفارش" backUrl="/basket" />{state ? <CheckoutFlow initialState={state} /> : loadFailed ? <StateMessage imageSrc="/images/illustration-failed.png" title="ثبت سفارش در دسترس نیست" subtitle="لطفاً سبد خرید و تنظیمات پرداخت را بررسی کنید." /> : null}</>;
}
