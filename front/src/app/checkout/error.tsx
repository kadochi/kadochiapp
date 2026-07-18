"use client";

import { Header } from "@/components/layout/header";
import StateMessage from "@/components/layout/state-message";
import { Button } from "@/components/ui/button";

export default function CheckoutError({ reset }: { reset: () => void }) {
  return <>
    <Header variant="internal" title="ثبت سفارش" backUrl="/basket" />
    <StateMessage
      imageSrc="/images/illustration-failed.png"
      title="ثبت سفارش با مشکل مواجه شد"
      subtitle="سبد خرید شما محفوظ است. لطفاً دوباره تلاش کنید."
      actions={<Button onClick={reset} size="large" variant="primary-filled">تلاش دوباره</Button>}
    />
  </>;
}
