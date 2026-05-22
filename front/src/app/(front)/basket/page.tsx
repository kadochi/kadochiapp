// src/app/(front)/basket/page.tsx
import type { Metadata } from "next";
import Header from "@/components/layout/Header/Header";
import CartPageClient from "./CartPageClient";

export const metadata: Metadata = {
  title: "سبد خرید",
};

export default function BasketPage() {
  return (
    <>
      <Header variant="internal" title="سبد خرید" backUrl="/" />
      <main>
        <CartPageClient />
      </main>
    </>
  );
}
